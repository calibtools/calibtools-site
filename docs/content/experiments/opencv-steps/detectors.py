"""The same 400 views rendered twice, as a ChArUco board and as a plain checkerboard, and found three ways.
Per corner: distance from the true position. Per session of 20 views: the camera model each set of corners gives.
Run: python detectors.py   (about 15 minutes)"""
import json, numpy as np, cv2
from lab import *
charuco, checker = Board("charuco"), Board("checker")
KW = dict(tilt=(5, 45), distance=(0.8, 1.25))
out = {k: dict(views_found=0, corner_err=[], sessions=[]) for k in ("charuco", "checkerboard_sb", "checkerboard_classic")}
for s in range(20):
    rng = np.random.default_rng([12, s]); sets = {k: ([], []) for k in out}
    for _ in range(20):
        r, t = pose(charuco, rng, **KW); truth = project(charuco.corners, r, t)
        cc, ci = detect_charuco(charuco, render(charuco, r, t, rng))
        if cc is not None:
            out["charuco"]["views_found"] += 1; out["charuco"]["corner_err"] += np.linalg.norm(cc - truth[ci], axis=1).tolist()
            sets["charuco"][0].append(charuco.corners[ci].astype(np.float32)); sets["charuco"][1].append(cc.astype(np.float32))
        img = render(checker, r, t, rng)
        for k, f in (("checkerboard_sb", detect_sb), ("checkerboard_classic", detect_classic)):
            c = f(img)
            if c is None: continue
            e = match_to_truth(c, truth)
            if e.mean() > 5: continue                      # corners in an order that fits neither end: counted as not found
            if np.linalg.norm(c[::-1] - truth, axis=1).mean() < np.linalg.norm(c - truth, axis=1).mean(): c = c[::-1]
            out[k]["views_found"] += 1; out[k]["corner_err"] += e.tolist()
            sets[k][0].append(checker.corners.astype(np.float32)); sets[k][1].append(c.astype(np.float32))
    for k, (obj, im) in sets.items():
        rms, K2, d2, _, _ = cv2.calibrateCamera(obj, im, (W, H), None, None)
        out[k]["sessions"].append(dict(session=s, views=len(obj), rms=rms, model_worst=model_error(K2, d2)[1], fx=K2[0, 0]))
    print(s, {k: (v["views_found"], round(float(np.median(v["corner_err"])), 3), round(v["sessions"][-1]["model_worst"], 3)) for k, v in out.items()}, flush=True)
json.dump(dict(opencv=cv2.__version__, views=400, results=out), open("results/detectors.json", "w"))
