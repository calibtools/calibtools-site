"""How small can the squares get in the image? One 14 x 9 board, 40 views per size, whole board in the image.
Run: python pixels.py   (about 3 minutes)"""
import json, numpy as np, cv2
from lab import *
PX = [41, 33, 27, 23, 20, 18, 16, 14, 12, 10]         # square size in the image, square-on
VIEWS = 40
b = Board(14, 9); rows = []
for px in PX:
    fill = px * b.cols / W
    rng = np.random.default_rng(px)
    found = total = views_found = 0; err = []; markers = 0
    for _ in range(VIEWS):
        r, t = pose(b, fill, rng, "spread", (0, 35))
        img = render(b, r, t, rng)
        tr = project(b.corners, r, t); total += len(tr)
        _, mi, _ = ARUCO.ArucoDetector(DICT).detectMarkers(img)
        markers += 0 if mi is None else len(mi)
        cc, ci, _, _ = b.detector.detectBoard(img)
        if ci is None or len(ci) == 0: continue
        views_found += 1; found += len(ci); err.append(np.linalg.norm(cc.reshape(-1, 2) - tr[ci.ravel()], axis=1))
    e = np.concatenate(err) if err else np.array([np.nan])
    rows.append(dict(px_per_square=px, px_per_marker_bit=round(px * 0.75 / 8, 2), fill_pct=round(100 * fill, 1), views=VIEWS, views_with_corners=views_found,
                     markers_found=markers, markers_total=VIEWS * (b.cols * b.rows // 2), corners_found=found, corners_total=total,
                     err_median=float(np.median(e)) if err else None, err_p95=float(np.percentile(e, 95)) if err else None,
                     err_max=float(e.max()) if err else None, over_1px=int((e > 1).sum())))
    print(rows[-1], flush=True)
json.dump(dict(opencv=cv2.__version__, marker_to_square=0.75, rows=rows), open("results/pixels.json", "w"), indent=1)
