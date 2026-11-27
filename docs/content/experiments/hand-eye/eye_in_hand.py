"""The code of the guide for a camera on the robot, top to bottom. Run it in a folder with camera.yaml, poses.json and the
images poses.json names (end_to_end.py makes such a folder)."""
import json
import cv2
import numpy as np
from scipy.spatial.transform import Rotation

def pose_matrix(xyz_mm, rpy_deg, order="xyz"):
    """Controller pose -> 4x4 T_gripper2base in meters. Check `order` against your manual."""
    T = np.eye(4)
    T[:3, :3] = Rotation.from_euler(order, rpy_deg, degrees=True).as_matrix()
    T[:3, 3] = np.asarray(xyz_mm, float) / 1000.0
    return T

fs = cv2.FileStorage("camera.yaml", cv2.FILE_STORAGE_READ)
K = fs.getNode("K").mat()
dist = fs.getNode("dist").mat()
fs.release()

d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
board = cv2.aruco.CharucoBoard((10, 7), 0.030, 0.022, d)  # (cols, rows), square, marker, meters
detector = cv2.aruco.CharucoDetector(board)

def target_pose(gray):
    corners, ids, _, _ = detector.detectBoard(gray)
    if ids is None or len(ids) < 6:
        return None
    obj, img = board.matchImagePoints(corners, ids)
    ok, rvec, tvec = cv2.solvePnP(obj, img, K, dist, flags=cv2.SOLVEPNP_IPPE)
    if not ok:
        return None
    R, _ = cv2.Rodrigues(rvec)
    return R, tvec.ravel()

R_g2b, t_g2b, R_t2c, t_t2c = [], [], [], []
for rec in json.load(open("poses.json")):
    gray = cv2.imread(rec["image"], cv2.IMREAD_GRAYSCALE)
    pose = target_pose(gray)
    if pose is None:
        print("skipping", rec["image"])
        continue
    T = pose_matrix(rec["xyz_mm"], rec["rpy_deg"])
    R_g2b.append(T[:3, :3]); t_g2b.append(T[:3, 3])
    R_t2c.append(pose[0]);   t_t2c.append(pose[1])
print(len(R_g2b), "poses")

R, t = cv2.calibrateHandEye(R_g2b, t_g2b, R_t2c, t_t2c,
                            method=cv2.CALIB_HAND_EYE_PARK)
T_cam2gripper = np.eye(4)
T_cam2gripper[:3, :3] = R
T_cam2gripper[:3, 3] = t.ravel()
print(T_cam2gripper)

X = T_cam2gripper
spread = []
for Rg, tg, Rt, tt in zip(R_g2b, t_g2b, R_t2c, t_t2c):
    Tg = np.eye(4); Tg[:3, :3] = Rg; Tg[:3, 3] = tg
    Tt = np.eye(4); Tt[:3, :3] = Rt; Tt[:3, 3] = tt
    spread.append((Tg @ X @ Tt)[:3, 3])
spread = np.array(spread)
dev = np.linalg.norm(spread - spread.mean(axis=0), axis=1) * 1000
print("target position spread, mm: mean %.2f max %.2f" % (dev.mean(), dev.max()))

fs = cv2.FileStorage("hand_eye.yaml", cv2.FILE_STORAGE_WRITE)
fs.write("T_cam2gripper", T_cam2gripper)   # or T_cam2base
fs.write("K", K)
fs.write("dist", dist)
fs.release()
