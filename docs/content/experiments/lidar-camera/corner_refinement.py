"""Does the ArUco detector's corner refinement setting matter? Ten sets of ten rendered placements (64-line LiDAR), the same
images and clouds solved three times. Run: python corner_refinement.py   (about 5 minutes)"""
import json, numpy as np, cv2
from lab import *
import end_to_end_render as rr
aruco = cv2.aruco; D = aruco.getPredefinedDictionary(aruco.DICT_5X5_100)
METHODS = {"none (the default)": aruco.CORNER_REFINE_NONE, "subpix": aruco.CORNER_REFINE_SUBPIX, "apriltag": aruco.CORNER_REFINE_APRILTAG}
board = aruco.Board(MARKER_CORNERS.astype(np.float32), D, np.arange(4))
out = {m: [] for m in METHODS}
for s in range(10):
    rng = np.random.default_rng([5, s]); data = []
    for _ in range(10):
        Tcb = placement(rng); cloud, line = scan(inv(T_CAM_LIDAR) @ Tcb, "64 lines", rng)
        data.append((rr.render(Tcb, rng), Tcb, find_holes(cloud, HOLES, HOLE_R, line)[0]))
    for name, method in METHODS.items():
        p = aruco.DetectorParameters(); p.cornerRefinementMethod = method; det = aruco.ArucoDetector(D, p)
        Pl, Pc, corner_err = [], [], []
        for gray, Tcb, centres in data:
            c, ids, _ = det.detectMarkers(gray)
            if ids is None or len(ids) < 2 or centres is None: continue
            obj, img = board.matchImagePoints(c, ids)
            truth = cv2.projectPoints(obj, cv2.Rodrigues(Tcb[:3, :3])[0], Tcb[:3, 3], K, DIST)[0].reshape(-1, 2)
            corner_err.append(np.linalg.norm(img.reshape(-1, 2) - truth, axis=1))
            ok, r, t = cv2.solvePnP(obj, img, K, DIST, flags=cv2.SOLVEPNP_IPPE); M = T(cv2.Rodrigues(r)[0], t)
            Pc.append((M[:3, :3] @ HOLES.T).T + M[:3, 3]); Pl.append(centres)
        rot, tr, far = errors(kabsch(np.vstack(Pl), np.vstack(Pc)))
        out[name].append(dict(set=s, used=len(Pl), corner_err_px=float(np.median(np.concatenate(corner_err))), rot_deg=rot, trans_mm=tr, at_20m_mm=far))
    print(s, {m: (round(v[-1]["corner_err_px"], 2), round(v[-1]["trans_mm"], 1), round(v[-1]["at_20m_mm"])) for m, v in out.items()}, flush=True)
json.dump(dict(sets=10, placements=10, methods=out), open("results/corner_refinement.json", "w"), indent=1)
