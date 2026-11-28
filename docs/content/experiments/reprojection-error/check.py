import glob
import cv2
import numpy as np

d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
board = cv2.aruco.CharucoBoard((10, 7), 0.025, 0.018, d)   # your board: squares across, down, square and marker size in meters
detector = cv2.aruco.CharucoDetector(board)

names, obj_all, img_all = [], [], []
for path in sorted(glob.glob("images/*.png")):
    gray = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    corners, ids, _, _ = detector.detectBoard(gray)
    if ids is None or len(ids) < 8:
        continue
    obj, img = board.matchImagePoints(corners, ids)
    names.append(path); obj_all.append(obj); img_all.append(img)

size = gray.shape[::-1]
rms, K, dist, rvecs, tvecs, _, _, per_view = cv2.calibrateCameraExtended(obj_all, img_all, size, None, None)
per_view = per_view.ravel()
print("%d views, RMS %.3f px" % (len(names), rms))

# 1. Error per view: one view far above the others is a frame to look at.
typical = np.median(per_view)
for name, e in zip(names, per_view):
    print("%s  %.3f px%s" % (name, e, "   <-- %.1f times the median" % (e / typical) if e > 3 * typical else ""))

# 2. Error by distance from the image center, and how many corners each ring holds.
radius, error = [], []
for obj, img, r, t in zip(obj_all, img_all, rvecs, tvecs):
    proj, _ = cv2.projectPoints(obj, r, t, K, dist)
    p = img.reshape(-1, 2)
    error.append(np.linalg.norm(proj.reshape(-1, 2) - p, axis=1))
    radius.append(np.hypot(p[:, 0] - K[0, 2], p[:, 1] - K[1, 2]))
radius, error = np.concatenate(radius), np.concatenate(error)
edges = np.linspace(0, np.hypot(size[0] / 2, size[1] / 2), 5)
for lo, hi in zip(edges[:-1], edges[1:]):
    ring = (radius >= lo) & (radius < hi)
    mean = "%.3f px" % error[ring].mean() if ring.any() else "no corners"
    print("%4.0f to %4.0f px from the center: %4d corners, mean error %s" % (lo, hi, ring.sum(), mean))
