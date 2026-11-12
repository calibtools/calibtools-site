"""What OpenCV still returns when 45 % of the board is outside the image.

    pnpm guides:figures --pngs && python3 docs/content/experiments/partial-view-detect.py && pnpm guides:figures

Reads out/partial-view/list.json and the PNGs next to it, writes src/data/partial-view-detection.json:
points in millimeters from the top-left corner of the pattern. The checkerboard is searched for the way
calibration code does it, with the full interior-corner size of the board.
"""
import json
import cv2
import numpy as np

items = json.load(open('out/partial-view/list.json'))
results = []
for it in items:
    img = cv2.imread(f"out/partial-view/{it['key']}.png", cv2.IMREAD_GRAYSCALE)
    to_mm = lambda p: (np.asarray(p, float).reshape(-1, 2) / it['pxPerMm'] - it['margin'])
    pts, found = np.zeros((0, 2)), False
    if it['type'] == 'Checkerboard':
        size = (it['cols'] - 1, it['rows'] - 1)
        ok_sb, c_sb = cv2.findChessboardCornersSB(img, size)
        ok, c = cv2.findChessboardCorners(img, size)
        found = bool(ok_sb or ok)
        if found:
            pts = to_mm(c_sb if ok_sb else c)
    elif it['type'] == 'ChArUco':
        d = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, it['dict']))
        board = cv2.aruco.CharucoBoard((it['cols'], it['rows']), it['square'], it['marker'], d)
        cc, ids, _, _ = cv2.aruco.CharucoDetector(board).detectBoard(img)
        if ids is not None:
            found, pts = True, to_mm(cc)
            # every returned corner sits where the board definition puts it
            want = board.getChessboardCorners()[ids.flatten()][:, :2]
            assert np.abs(pts - want).max() < 0.5, np.abs(pts - want).max()
    else:
        p = cv2.aruco.DetectorParameters()
        p.markerBorderBits = it['borderBits']
        corners, ids, _ = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11), p).detectMarkers(img)
        if ids is not None:
            found, pts = True, np.vstack([to_mm(c) for c in corners])
    results.append({'key': it['key'], 'found': found, 'points': [[round(float(x), 2), round(float(y), 2)] for x, y in pts]})
    print(it['key'], 'found' if found else 'not found', len(pts), 'points')

json.dump({'opencv': cv2.__version__, 'visible': items[0]['visible'], 'pxPerMm': items[0]['pxPerMm'], 'results': results},
          open('src/data/partial-view-detection.json', 'w'), indent=1)
