"""Board 1 in view, an identical board 2 entering from the side. How many repeated markers does it take to lose the view?
Run: python duplicates.py  (about 3 minutes)"""
import json, numpy as np, cv2
from lab import *
b1 = board(0); b2 = board(0)
on = ARUCO.CharucoDetector(b1)
p = ARUCO.CharucoParameters(); p.checkMarkers = False; off = ARUCO.CharucoDetector(b1, p)
markers = ARUCO.ArucoDetector(DICT)
rows = []
rng = np.random.default_rng(7)
for k in range(300):
    z = rng.uniform(800, 1100)
    r1, t1 = look_at((rng.uniform(-260, -120), rng.uniform(-120, 120), z), z, rng.uniform(0, 30), rng, rng.uniform(-10, 10))
    r2, t2 = look_at((rng.uniform(200, 700), rng.uniform(-150, 150), z + rng.uniform(-150, 150)), z, rng.uniform(0, 30), rng, rng.uniform(-10, 10))
    img = render([(b1, r1, t1), (b2, r2, t2)], rng)
    _, ids, _ = markers.detectMarkers(img)
    ids = [] if ids is None else list(ids.ravel())
    repeated = len(ids) - len(set(ids))
    T1 = truth(b1, r1, t1)
    cc, ci, _, _ = on.detectBoard(img)
    kept = 0 if ci is None else len(ci)
    cc2, ci2, _, _ = off.detectBoard(img)
    wrong = 0 if ci2 is None else int((np.linalg.norm(cc2.reshape(-1, 2) - T1[ci2.ravel()], axis=1) > 2).sum())
    rows.append(dict(repeated=repeated, corners_default=kept, corners_check_off=0 if ci2 is None else len(ci2), wrong_check_off=wrong))
json.dump(dict(opencv=cv2.__version__, views=rows), open("results/duplicates.json", "w"), indent=1)
for n in sorted(set(r["repeated"] for r in rows)):
    g = [r for r in rows if r["repeated"] == n]
    print(n, len(g), "kept", sum(r["corners_default"] > 0 for r in g), "check-off views with wrong corners", sum(r["wrong_check_off"] > 0 for r in g))
