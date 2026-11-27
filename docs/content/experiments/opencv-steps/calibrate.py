import glob
import cv2
import numpy as np

d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
board = cv2.aruco.CharucoBoard((10, 7), 0.025, 0.018, d)   # squares across, squares down, square and marker size in meters
detector = cv2.aruco.CharucoDetector(board)

obj_all, img_all = [], []
for path in sorted(glob.glob("images/*.png")):
    gray = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    corners, ids, _, _ = detector.detectBoard(gray)
    if ids is None or len(ids) < 8:
        continue  # too few corners in this view
    obj, img = board.matchImagePoints(corners, ids)
    obj_all.append(obj)
    img_all.append(img)
print(len(obj_all), "views used")

size = gray.shape[::-1]  # (width, height)
rms, K, dist, rvecs, tvecs = cv2.calibrateCamera(obj_all, img_all, size, None, None)
np.set_printoptions(precision=4, suppress=True)
print("RMS reprojection error: %.3f px" % rms)
print("K =\n", K)
print("dist =", dist.ravel())

per_view = []
for o, p, r, t in zip(obj_all, img_all, rvecs, tvecs):
    proj, _ = cv2.projectPoints(o, r, t, K, dist)
    diff = p.reshape(-1, 2) - proj.reshape(-1, 2)
    per_view.append(float(np.sqrt((diff ** 2).sum(axis=1).mean())))
print("per-view error, px:", np.round(per_view, 2))
print("worst view: %.2f px, median view: %.2f px" % (max(per_view), np.median(per_view)))

fs = cv2.FileStorage("camera.yaml", cv2.FILE_STORAGE_WRITE)
fs.write("K", K)
fs.write("dist", dist)
fs.write("image_size", np.array(size))
fs.release()
