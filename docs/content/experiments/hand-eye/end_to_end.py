"""Runs the guide's own code on rendered images. Renders 15 views for each arrangement with the renderer of the image-count
experiment, writes camera.yaml and poses.json as a robot cell would, runs eye_in_hand.py / eye_to_hand.py there, and compares
the saved result with the truth. Run: python end_to_end.py   (writes to /tmp/hand-eye-in and /tmp/hand-eye-to)"""
import json, os, subprocess, sys, numpy as np, cv2
from scipy.spatial.transform import Rotation as Rot
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "image-count"))
import lab as cam                                   # 1280 x 960 camera, 10 x 7 board with 30 mm squares, mm
def T(R, t):
    M = np.eye(4); M[:3, :3] = R; M[:3, 3] = np.asarray(t, float).ravel(); return M
def inv(M):
    return T(M[:3, :3].T, -M[:3, :3].T @ M[:3, 3])

X_TRUE = T(Rot.from_euler("xyz", [4, -7, 12], degrees=True).as_matrix(), [35, -48, 82])          # camera in flange (or base) frame, mm
OTHER = T(Rot.from_euler("xyz", [178, 3, 25], degrees=True).as_matrix(), [620, -90, 15])         # board in base (or flange) frame, mm
POSES, out = 15, {}
for mode, script in (("in", "eye_in_hand.py"), ("to", "eye_to_hand.py")):
    folder = f"/tmp/hand-eye-{mode}"; os.makedirs(folder, exist_ok=True)
    rng = np.random.default_rng(11 if mode == "in" else 12); recs = []
    for i in range(POSES):
        rvec, tvec = cam.good_pose(rng)                                    # whole board in view, tilted 10 to 40 degrees
        roll = Rot.from_euler("z", rng.uniform(-40, 40), degrees=True).as_matrix()      # turn the camera about its own axis as well
        view = T(roll @ cv2.Rodrigues(rvec)[0], roll @ tvec)
        r2, t2 = cv2.Rodrigues(view[:3, :3])[0].ravel(), view[:3, 3]
        if not cam.in_frame(cam.truth(r2, t2)): view = T(cv2.Rodrigues(rvec)[0], tvec); r2, t2 = rvec, tvec
        cv2.imwrite(f"{folder}/pose_{i:02d}.png", cam.render(r2, t2, rng))
        g2b = OTHER @ inv(view) @ inv(X_TRUE)                              # eye-in-hand: flange in base
        if mode == "to": g2b = inv(g2b)                                    # eye-to-hand: the same chain is base in flange
        g2b[:3, 3] += rng.normal(0, 0.05, 3)                               # robot reading error, mm
        g2b[:3, :3] = Rot.from_rotvec(np.deg2rad(rng.normal(0, 0.01, 3))).as_matrix() @ g2b[:3, :3]
        recs.append(dict(image=f"pose_{i:02d}.png", xyz_mm=[round(float(v), 4) for v in g2b[:3, 3]],
                         rpy_deg=[round(float(v), 5) for v in Rot.from_matrix(g2b[:3, :3]).as_euler("xyz", degrees=True)]))
    json.dump(recs, open(f"{folder}/poses.json", "w"), indent=1)
    fs = cv2.FileStorage(f"{folder}/camera.yaml", cv2.FILE_STORAGE_WRITE); fs.write("K", cam.K); fs.write("dist", cam.DIST.reshape(1, -1)); fs.release()
    log = subprocess.run([sys.executable, os.path.join(HERE, script)], cwd=folder, capture_output=True, text=True)
    if log.returncode: sys.exit(log.stderr)
    fs = cv2.FileStorage(f"{folder}/hand_eye.yaml", cv2.FILE_STORAGE_READ)
    X = fs.getNode("T_cam2gripper" if mode == "in" else "T_cam2base").mat(); fs.release()
    dR = X[:3, :3] @ X_TRUE[:3, :3].T
    rot = float(np.degrees(np.arccos(np.clip((np.trace(dR) - 1) / 2, -1, 1)))); tr = float(np.linalg.norm(X[:3, 3] * 1000 - X_TRUE[:3, 3]))
    lines = log.stdout.strip().split("\n")
    out[mode] = dict(script=script, poses_used=int(lines[[l.endswith(" poses") for l in lines].index(True)].split()[0]), rotation_error_deg=rot, translation_error_mm=tr,
                     spread_line=lines[-1])
    print(mode, out[mode])
json.dump(dict(opencv=cv2.__version__, poses=POSES, robot_noise=dict(mm=0.05, deg=0.01), results=out), open(os.path.join(HERE, "results/end_to_end.json"), "w"), indent=1)
