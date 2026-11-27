"""The guide's code from the marker pose to the check, run on a folder made by end_to_end.py:
camera.yaml, target.json, and for every placement NN.png and NN_cloud.npy (x, y, z, ring)."""
import glob, json, sys
import cv2
import numpy as np
from pipeline import find_holes, kabsch

folder = sys.argv[1]
fs = cv2.FileStorage(folder + "/camera.yaml", cv2.FILE_STORAGE_READ)
K, dist = fs.getNode("K").mat(), fs.getNode("dist").mat(); fs.release()
target = json.load(open(folder + "/target.json"))
HOLES_BOARD = np.array(target["holes"]); HOLE_RADIUS = target["hole_radius"]
marker_corners_board = np.array(target["marker_corners"], np.float32); marker_ids = np.array(target["marker_ids"])
placements = [(cv2.imread(f, cv2.IMREAD_GRAYSCALE), np.load(f[:-4] + "_cloud.npy")) for f in sorted(glob.glob(folder + "/[0-9][0-9].png"))]

d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_5X5_100)
board = cv2.aruco.Board(marker_corners_board, d, marker_ids)   # corners in meters, board frame
params = cv2.aruco.DetectorParameters()
params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_APRILTAG   # the default is no refinement at all
detector = cv2.aruco.ArucoDetector(d, params)

def board_pose(gray, K, dist):
    corners, ids, _ = detector.detectMarkers(gray)
    if ids is None or len(ids) < 2:
        return None
    obj, img = board.matchImagePoints(corners, ids)
    ok, rvec, tvec = cv2.solvePnP(obj, img, K, dist, flags=cv2.SOLVEPNP_IPPE)
    if not ok:
        return None
    T = np.eye(4); T[:3, :3] = cv2.Rodrigues(rvec)[0]; T[:3, 3] = tvec.ravel()
    return T   # T_cam_board

P_lidar, P_cam = [], []
for gray, cloud in placements:
    T_cam_board = board_pose(gray, K, dist)
    centres, misfit = find_holes(cloud[:, :3], HOLES_BOARD, HOLE_RADIUS, line=cloud[:, 3])
    if T_cam_board is None or centres is None or misfit > 0.01:
        continue
    P_cam.append((T_cam_board[:3, :3] @ HOLES_BOARD.T).T + T_cam_board[:3, 3])
    P_lidar.append(centres)

print(len(P_lidar), "of", len(placements), "placements used")
P_lidar, P_cam = np.vstack(P_lidar), np.vstack(P_cam)
T_cam_lidar = kabsch(P_lidar, P_cam)
resid = np.linalg.norm((T_cam_lidar[:3, :3] @ P_lidar.T).T + T_cam_lidar[:3, 3] - P_cam, axis=1)
np.set_printoptions(precision=4, suppress=True)
print(T_cam_lidar)
print("fit residual mm: mean %.1f max %.1f" % (resid.mean() * 1000, resid.max() * 1000))

def project_cloud(cloud, T_cam_lidar, K, dist, image):
    pc = (T_cam_lidar[:3, :3] @ cloud.T).T + T_cam_lidar[:3, 3]
    pc = pc[pc[:, 2] > 0.5]
    uv, _ = cv2.projectPoints(pc, np.zeros(3), np.zeros(3), K, dist)
    out = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    for u, v in uv.reshape(-1, 2):
        if 0 <= u < out.shape[1] and 0 <= v < out.shape[0]:
            cv2.circle(out, (int(u), int(v)), 2, (0, 0, 255), -1)
    return out

cv2.imwrite(folder + "/overlay.png", project_cloud(placements[0][1][:, :3], T_cam_lidar, K, dist, placements[0][0]))
np.save(folder + "/T_cam_lidar.npy", T_cam_lidar)
