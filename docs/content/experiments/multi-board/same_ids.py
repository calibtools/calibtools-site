"""Two ChArUco boards side by side in one image, first with the same marker IDs, then with separate ones.
Needs numpy and opencv-python 4.8 or later."""
import numpy as np, cv2

aruco = cv2.aruco
dictionary = aruco.getPredefinedDictionary(aruco.DICT_6X6_250)

def board(first_id):
    ids = np.arange(first_id, first_id + 35)                # a 10 x 7 board has 35 markers
    return aruco.CharucoBoard((10, 7), 30, 22, dictionary, ids)

def picture(b1, b2):
    a = b1.generateImage((640, 460), marginSize=20)
    b = b2.generateImage((640, 460), marginSize=20)
    img = np.hstack([a, np.full((460, 60), 255, np.uint8), b])
    return cv2.copyMakeBorder(img, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=255)

for name, second in [("same IDs", 0), ("IDs 35-69", 35)]:
    b1 = board(0)
    img = picture(b1, board(second))
    for check in (True, False):
        params = aruco.CharucoParameters()
        params.checkMarkers = check
        corners, ids, _, marker_ids = aruco.CharucoDetector(b1, params).detectBoard(img)
        n = 0 if ids is None else len(ids)
        print(f"{name:10s}  checkMarkers={check!s:5s}  markers found {len(marker_ids):2d}  board 1 corners {n:2d}", end="")
        if n:
            # where the corners should be: inner corners of the left board, in pixels
            sq = 600 / 10
            truth = (b1.getChessboardCorners()[:, :2] / 30 * sq + 40 + 20)[ids.ravel()]
            off = np.linalg.norm(corners.reshape(-1, 2) - truth, axis=1)
            bad = off > 2
            print(f"  more than 2 px off: {int(bad.sum()):2d}" + (f", up to {off.max():.0f} px" if bad.any() else ""), end="")
        print()
