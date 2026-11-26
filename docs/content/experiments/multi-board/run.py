"""Sessions of 20 views of a two-board rig. Run: python run.py  (about 2 minutes)"""
import json, sys, time, numpy as np, cv2
from lab import *
SESSIONS, VIEWS = int(sys.argv[1]) if len(sys.argv) > 1 else 20, 20

def detect(img, b, check=True):
    p = ARUCO.CharucoParameters(); p.checkMarkers = check
    cc, ci, _, _ = ARUCO.CharucoDetector(b, p).detectBoard(img)
    if ci is None or len(ci) < 6 or b.checkCharucoCornersCollinear(ci): return None, None   # too few to solve from
    return cc.reshape(-1, 2), ci.ravel()

def solve(b, found):
    obj, img = [], []
    for cc, ci in found:
        obj.append(b.getChessboardCorners()[ci].astype(np.float32)); img.append(cc.astype(np.float32))
    if len(obj) < 4: return None
    try:
        rms, K2, d2, _, _ = cv2.calibrateCamera(obj, img, (W, H), None, None)
    except cv2.error:
        return dict(failed=True, views=len(obj))   # OpenCV could not start the solve from these points
    mean, worst = model_error(K2, d2)
    return dict(rms=rms, model_mean=mean, model_worst=worst, views=len(obj))

out = []
t0 = time.time()
for s in range(SESSIONS):
    rng = np.random.default_rng(1000 + s)
    poses = rig_poses(rng, VIEWS)
    row = {"session": s}
    for ids in ("distinct", "same"):
        b1, b2 = board(0), board(0 if ids == "same" else COLS * ROWS // 2)
        imgs = [render([(b1, r1, t1), (b2, r2, t2)], rng) for r1, t1, r2, t2 in poses]
        tr1 = [truth(b1, p[0], p[1]) for p in poses]
        for check in ((True, False) if ids == "same" else (True,)):
            f1 = [detect(im, b1, check) for im in imgs]
            kept = [(cc, ci) for cc, ci in f1 if ci is not None]
            off = [float(np.max(np.linalg.norm(cc - tr1[k][ci], axis=1))) for k, (cc, ci) in enumerate(f1) if ci is not None]
            key = f"{ids}_{'check' if check else 'nocheck'}"
            row[key] = dict(views_kept=len(kept), corners=int(sum(len(ci) for _, ci in kept)),
                            views_with_wrong=int(sum(o > 2 for o in off)), worst_off=max(off) if off else None,
                            board1=solve(b1, kept))
        if ids == "distinct":   # both boards used, each board image as its own view
            f2 = [detect(im, b2) for im in imgs]
            both = [(cc, ci) for cc, ci in f1 if ci is not None]
            obj = [b1.getChessboardCorners()[ci] for _, ci in both] + [b2.getChessboardCorners()[ci] for cc, ci in f2 if ci is not None]
            im_ = [cc for cc, _ in both] + [cc for cc, ci in f2 if ci is not None]
            rms, K2, d2, _, _ = cv2.calibrateCamera([o.astype(np.float32) for o in obj], [i.astype(np.float32) for i in im_], (W, H), None, None)
            m, w = model_error(K2, d2)
            row["distinct_both"] = dict(views=len(obj), rms=rms, model_mean=m, model_worst=w)
    out.append(row)
    print(s, f"{time.time()-t0:.0f}s", json.dumps({k: (v.get('views_kept'), v.get('board1') or v.get('views')) if isinstance(v, dict) else v for k, v in row.items()}), flush=True)
json.dump(dict(opencv=cv2.__version__, sessions=out), open("results/sessions.json", "w"), indent=1)
