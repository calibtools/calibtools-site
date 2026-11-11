"""Checks that OpenCV finds every stock circle grid, and that asymmetric grids keep their
orientation: after a half turn the first point is still the same physical circle.

  npx tsx scripts/circle-grid-pngs.ts && python3 docs/content/experiments/circle-grid-detect.py

Pattern sizes: symmetric (cols, rows); asymmetric (cols / 2, rows), where rows x cols are the
lattice positions in src/lib/catalogPatterns.ts.
"""
import json
import sys

import cv2
import numpy as np

params = cv2.SimpleBlobDetector_Params()
params.maxArea = 100000  # the test images are large; the default 5000 px limit would drop the circles
detector = cv2.SimpleBlobDetector_create(params)
failed = 0
for o in json.load(open("out/circle-grids/list.json")):
    img = cv2.imread(f"out/circle-grids/{o['name']}.png", 0)
    h, w = img.shape
    sym = o["kind"] == "SYM"
    size = (o["cols"], o["rows"]) if sym else (o["cols"] // 2, o["rows"])
    flag = cv2.CALIB_CB_SYMMETRIC_GRID if sym else cv2.CALIB_CB_ASYMMETRIC_GRID
    firsts = []
    for code in (None, cv2.ROTATE_180):
        im = img if code is None else cv2.rotate(img, code)
        ok, pts = cv2.findCirclesGrid(im, size, flags=flag, blobDetector=detector)
        if not ok:
            failed += 1
            firsts.append(None)
            continue
        x, y = np.array(pts).reshape(-1, 2)[0]
        firsts.append((float(x), float(y)) if code is None else (w - 1 - float(x), h - 1 - float(y)))
    same = None not in firsts and abs(firsts[0][0] - firsts[1][0]) < 2 and abs(firsts[0][1] - firsts[1][1]) < 2
    if not sym and not same:
        failed += 1
    print(f"{o['name']}: size {size}, found {None not in firsts}, margins {o['marginX']}/{o['marginY']} mm" + ("" if sym else f", same first circle after a half turn: {same}"))
sys.exit(1 if failed else 0)
