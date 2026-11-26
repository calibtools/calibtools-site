"""Data for the first figure of the guide: two boards side by side, flat, and the corners OpenCV returns for board 1.
Writes src/data/same-ids-detection.json (run from the repository root: python docs/content/experiments/multi-board/figure.py)."""
import json, numpy as np, cv2
aruco = cv2.aruco
D = aruco.getPredefinedDictionary(aruco.DICT_6X6_250)
PX, GAP, MARGIN = 6, 40, 20            # px per mm, mm between boards, mm of white around them
def board(first): return aruco.CharucoBoard((10, 7), 30, 22, D, np.arange(first, first + 35))
def strip(second):
    a = board(0).generateImage((300 * PX, 210 * PX)); b = board(second).generateImage((300 * PX, 210 * PX))
    img = np.hstack([a, np.full((210 * PX, GAP * PX), 255, np.uint8), b])
    return cv2.copyMakeBorder(img, MARGIN * PX, MARGIN * PX, MARGIN * PX, MARGIN * PX, cv2.BORDER_CONSTANT, value=255)
cases = []
for key, second, check in [("same", 0, True), ("same_check_off", 0, False), ("separate", 35, True)]:
    p = aruco.CharucoParameters(); p.checkMarkers = check
    img = strip(second)
    cc, ci, _, mi = aruco.CharucoDetector(board(0), p).detectBoard(cv2.GaussianBlur(img, (0, 0), 1.0))
    pts = [] if ci is None else [[round(float(x) / PX - MARGIN, 2), round(float(y) / PX - MARGIN, 2)] for x, y in cc.reshape(-1, 2)]
    truth = board(0).getChessboardCorners()[:, :2]
    right = [] if ci is None else [bool(np.linalg.norm(np.array(q) - truth[i]) < 1.0) for q, i in zip(pts, ci.ravel())]
    # the same corner of board 2, which sits 300 mm + GAP to the right
    other = [] if ci is None else [bool(np.linalg.norm(np.array(q) - truth[i] - [300 + GAP, 0]) < 1.0) for q, i in zip(pts, ci.ravel())]
    cases.append(dict(key=key, second_start=second, check_markers=check, markers=len(mi), points=pts, on_board1=right, on_board2=other))
json.dump(dict(opencv=cv2.__version__, gap_mm=GAP, board_mm=[300, 210], cases=cases), open("src/data/same-ids-detection.json", "w"), indent=1)
for c in cases: print(c["key"], c["markers"], len(c["points"]), sum(c["on_board1"]), sum(c["on_board2"]))
