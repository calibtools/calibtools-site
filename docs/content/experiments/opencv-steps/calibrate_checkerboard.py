import glob
import cv2
import numpy as np

cols, rows, square = 10, 7, 0.025            # squares across, squares down, square size in meters
pattern = (cols - 1, rows - 1)               # inner corners
objp = np.zeros((pattern[0] * pattern[1], 3), np.float32)
objp[:, :2] = np.mgrid[0:pattern[0], 0:pattern[1]].T.reshape(-1, 2) * square
stop = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)

obj_all, img_all = [], []
for path in sorted(glob.glob("images/*.png")):
    gray = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    ok, corners = cv2.findChessboardCorners(gray, pattern)
    if not ok:
        continue  # the whole board has to be in view
    corners = cv2.cornerSubPix(gray, corners, (5, 5), (-1, -1), stop)
    obj_all.append(objp)
    img_all.append(corners)
print(len(obj_all), "views used")

rms, K, dist, rvecs, tvecs = cv2.calibrateCamera(obj_all, img_all, gray.shape[::-1], None, None)
np.set_printoptions(precision=4, suppress=True)
print("RMS reprojection error: %.3f px" % rms)
print("K =\n", K)
print("dist =", dist.ravel())
fs = cv2.FileStorage("camera.yaml", cv2.FILE_STORAGE_WRITE)
fs.write("K", K)
fs.write("dist", dist)
fs.release()
