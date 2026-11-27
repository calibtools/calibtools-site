"""Where in the frame did your calibration images put corners? Usage: python coverage.py <folder of images>
Needs numpy and opencv-python 4.8 or later. Set the board on the next lines to match yours."""
import sys, glob, numpy as np, cv2

COLS, ROWS, SQUARE, MARKER = 14, 9, 20.0, 15.0               # squares across, squares down, sizes in mm
DICTIONARY = cv2.aruco.DICT_6X6_250

board = cv2.aruco.CharucoBoard((COLS, ROWS), SQUARE, MARKER, cv2.aruco.getPredefinedDictionary(DICTIONARY))
detector = cv2.aruco.CharucoDetector(board)
grid = np.zeros((6, 8), int)                                 # the frame cut into 8 x 6 cells
obj, img, square_px, size = [], [], [], None
for path in sorted(glob.glob(sys.argv[1] + "/*")):
    image = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if image is None: continue
    size = image.shape[::-1]
    corners, ids, _, _ = detector.detectBoard(image)
    if ids is None or len(ids) < 6: continue
    pts, ids = corners.reshape(-1, 2), ids.ravel()
    obj.append(board.getChessboardCorners()[ids]); img.append(corners)
    np.add.at(grid, ((pts[:, 1] * 6 / size[1]).astype(int).clip(0, 5), (pts[:, 0] * 8 / size[0]).astype(int).clip(0, 7)), 1)
    where = {i: p for i, p in zip(ids, pts)}                 # distance between neighbors in a row = one square
    square_px += [np.linalg.norm(where[i + 1] - p) for i, p in where.items() if i + 1 in where and (i + 1) % (COLS - 1)]

print(f"{len(obj)} images with corners, squares about {np.median(square_px):.0f} px, marker bits about {np.median(square_px) * MARKER / SQUARE / 8:.1f} px")
for row in grid:
    print("  " + " ".join("##" if n >= 20 else "+ " if n else ". " for n in row))
print(f"cells of the frame with corners: {(grid > 0).sum()} of 48   (## 20 corners or more, + fewer, . none)")
rms = cv2.calibrateCamera(obj, img, size, None, None)[0]
print(f"reprojection error {rms:.3f} px")
