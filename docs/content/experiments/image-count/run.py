"""Calibrations from 3 to 60 images drawn from the rendered pool, 20 sessions each. Run: python run.py  (about 10 minutes)"""
import json, time, numpy as np, cv2
from lab import *
P = np.load("results/pool.npz", allow_pickle=True)
good = np.where(P["kind"] == "good")[0]; lazy = np.where(P["kind"] == "lazy")[0]
HELD = good[-60:]; DRAW = good[:-60]                    # 60 views kept out of every session for the check
COUNTS = [3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40, 60]
SESSIONS = 20
OBJ = BOARD.getChessboardCorners().astype(np.float32)
FLAGS = {"default": 0, "fixed_k3_no_tangential": cv2.CALIB_FIX_K3 | cv2.CALIB_ZERO_TANGENT_DIST}

def solve(idx, flags):
    obj = [OBJ[P["ids"][i]] for i in idx]; img = [P["corners"][i].astype(np.float32) for i in idx]
    try:
        rms, K2, d2, _, _ = cv2.calibrateCamera(obj, img, (W, H), None, None, flags=flags)
    except cv2.error:
        return dict(failed=True)
    mean, worst = model_error(K2, d2)
    # the check a reader can do: reprojection error on views that were not in the calibration
    e = []
    for h in HELD:
        o, p = OBJ[P["ids"][h]], P["corners"][h].astype(np.float32)
        ok, r, t = cv2.solvePnP(o, p, K2, d2)
        q = cv2.projectPoints(o, r, t, K2, d2)[0].reshape(-1, 2)
        e.append(np.linalg.norm(q - p, axis=1))
    e = np.concatenate(e)
    return dict(rms=float(rms), model_mean=mean, model_worst=worst, fx=float(K2[0, 0]), fy=float(K2[1, 1]),
                cx=float(K2[0, 2]), cy=float(K2[1, 2]), k1=float(d2.ravel()[0]), k2=float(d2.ravel()[1]), k3=float(d2.ravel()[4]),
                held_out_rms=float(np.sqrt(np.mean(e ** 2))), held_out_max=float(e.max()))

out = {"opencv": cv2.__version__, "true": dict(fx=1500.0, cx=640.0, cy=480.0, k1=-0.12), "held_out_views": int(len(HELD)), "cases": []}
t0 = time.time()
for kind, pool in (("good", DRAW), ("lazy", lazy)):
    for n in COUNTS:
        if kind == "lazy" and n not in (10, 20, 60): continue
        for name, fl in FLAGS.items():
            if kind == "lazy" and name != "default": continue
            case = dict(views=kind, n=n, flags=name, sessions=[])
            for s in range(SESSIONS):
                rng = np.random.default_rng(10_000 * n + s)
                idx = rng.choice(pool, n, replace=False)
                case["sessions"].append(solve(idx, fl))
            out["cases"].append(case)
            ok = [c for c in case["sessions"] if not c.get("failed")]
            print(kind, n, name, f"{time.time()-t0:.0f}s", "solved", len(ok), "median worst", f"{np.median([c['model_worst'] for c in ok]):.2f}" if ok else "-", flush=True)
json.dump(out, open("results/sessions.json", "w"), indent=1)
