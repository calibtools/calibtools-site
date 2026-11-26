"""How far away each dictionary still decodes, same 22 mm markers. Run: python reach.py  (about 5 minutes)"""
import json, numpy as np, cv2
from lab import *
NAMES = ["DICT_4X4_50", "DICT_4X4_250", "DICT_5X5_100", "DICT_5X5_1000", "DICT_6X6_250", "DICT_6X6_1000", "DICT_7X7_1000"]
DIST_MM = [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250]
VIEWS = 12
out = {}
for name in NAMES:
    d = ARUCO.getPredefinedDictionary(getattr(ARUCO, name)); b = board(0, d)
    centres = b.getObjPoints(); ids_true = b.getIds().ravel()
    det = ARUCO.ArucoDetector(d)
    rows = []
    for z in DIST_MM:
        rng = np.random.default_rng(z)
        ok = wrong = total = 0
        for v in range(VIEWS):
            r, t = look_at((rng.uniform(-100, 100), rng.uniform(-80, 80), z), z, rng.uniform(0, 30), rng, rng.uniform(-20, 20))
            img = render([(b, r, t)], rng)
            truth_c = [cv2.projectPoints(np.asarray(c, np.float64), r, t, K, DIST)[0].reshape(-1, 2).mean(0) for c in centres]
            corners, ids, _ = det.detectMarkers(img)
            total += len(ids_true)
            if ids is None: continue
            for c, i in zip(corners, ids.ravel()):
                cen = c.reshape(-1, 2).mean(0)
                k = np.where(ids_true == i)[0]
                if len(k) and np.linalg.norm(truth_c[k[0]] - cen) < 3: ok += 1
                else: wrong += 1
        rows.append(dict(distance_mm=z, marker_px=round(MK * K[0, 0] / z, 1), decoded=ok, wrong=wrong, total=total))
        print(name, rows[-1], flush=True)
    out[name] = dict(markers=d.bytesList.shape[0], cells=d.markerSize + 2, rows=rows)
json.dump(dict(opencv=cv2.__version__, marker_mm=MK, focal_px=K[0, 0], views=VIEWS, dictionaries=out), open("results/reach.json", "w"), indent=1)
