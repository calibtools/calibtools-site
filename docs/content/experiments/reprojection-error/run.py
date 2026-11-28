"""20 sessions for each case: 20 views to calibrate on, 8 more views held out. ChArUco board, rendered images.
Run: python run.py 0 2 & python run.py 1 2 ; wait ; python run.py merge"""
import json, sys, glob, numpy as np, cv2
from lab import *
SESSIONS, VIEWS, HELD = 20, 20, 8
GOOD = dict(tilt=(10, 35), distance=(0.8, 1.25))
#        name                 pose keywords for the 20 views      render keywords     other
CASES = [("good",             GOOD,                               {},                 {}),
         ("blur_2px",         GOOD,                               dict(blur=2.0),     {}),
         ("blur_3px",         GOOD,                               dict(blur=3.0),     {}),
         ("noise_x4",         GOOD,                               dict(noise=8.0),    {}),
         ("middle_only",      dict(GOOD, place="centre"),         {},                 {}),
         ("tilt_under_5",     dict(GOOD, tilt=(0, 5)),            {},                 {}),
         ("five_views",       GOOD,                               {},                 dict(views=5)),
         ("bowed_0.5mm",      GOOD,                               dict(bow=0.5),      {}),
         ("bowed_1mm",        GOOD,                               dict(bow=1.0),      {}),
         ("square_1pct_off",  GOOD,                               {},                 dict(scale=(1.01, 1.01))),
         ("stretched_0.3pct", GOOD,                               {},                 dict(scale=(1.003, 1.0))),
         ("one_view_shear_1px", GOOD,                             {},                 dict(bad_shear=1.0)),
         ("one_view_shear_2px", GOOD,                             {},                 dict(bad_shear=2.0)),
         ("one_view_shear_5px", GOOD,                             {},                 dict(bad_shear=5.0))]
FLAGS = dict(default=0, k1_only=cv2.CALIB_FIX_K2 | cv2.CALIB_FIX_K3 | cv2.CALIB_ZERO_TANGENT_DIST,
             rational_thin_prism=cv2.CALIB_RATIONAL_MODEL | cv2.CALIB_THIN_PRISM_MODEL)
INDEX = {c[0]: i for i, c in enumerate(CASES)}

def no_nan(x):
    """JSON has no NaN: a value the solver could not give is written as null. Six significant digits keep the file small."""
    if isinstance(x, float): return float("%.6g" % x) if np.isfinite(x) else None
    if isinstance(x, dict): return {k: no_nan(v) for k, v in x.items()}
    if isinstance(x, list): return [no_nan(v) for v in x]
    return x

def solve(obj, img, held, flags):
    try:
        rms, K2, d2, rv, tv, std_in, _, pv = cv2.calibrateCameraExtended(obj, img, (W, H), None, None, flags=flags)
    except cv2.error:
        return None
    mean, worst = model_error(K2, d2)
    return dict(rms=rms, model_mean=mean, model_worst=worst, fx=K2[0, 0], cx=K2[0, 2], cy=K2[1, 2], fx_std=float(std_in[0, 0]),
                per_view=[float(x) for x in pv.ravel()], held_out_rms=held_out_rms(held[0], held[1], K2, d2),
                straight_edge=straight_line_check(K2, d2), K=K2.tolist(), dist=d2.ravel().tolist(),
                radius=radius_bins(obj, img, K2, d2, rv, tv))

def session(name, kw, rkw, other, s, board):
    rng = np.random.default_rng([21, INDEX[name], s]); n = other.get("views", VIEWS)
    sx, sy = other.get("scale", (1.0, 1.0)); scale = np.array([sx, sy, 1.0], np.float32)   # what the user believes the board measures
    bad = int(rng.integers(n)) if "bad_shear" in other else None
    obj, img, kept = [], [], []
    for i in range(n):
        r, t = pose(board, rng, **kw)
        cc, ci = detect_charuco(board, render(board, r, t, rng, shear=other["bad_shear"] if i == bad else 0.0, **rkw))
        if cc is None: continue
        obj.append(board.corners[ci].astype(np.float32) * scale); img.append(cc.astype(np.float32)); kept.append(i)
    ho, hi = [], []
    for _ in range(HELD):                                   # held-out views: anywhere in the frame, same board and image quality
        r, t = pose(board, rng, **GOOD)
        cc, ci = detect_charuco(board, render(board, r, t, rng, **rkw))
        if cc is None: continue
        ho.append(board.corners[ci].astype(np.float32) * scale); hi.append(cc.astype(np.float32))
    out = dict(session=s, views=len(obj), bad_view=kept.index(bad) if bad in kept else None)
    for k, f in FLAGS.items(): out[k] = solve(obj, img, (ho, hi), f)
    if out["bad_view"] is not None:
        keep = [j for j in range(len(obj)) if j != out["bad_view"]]
        out["without_bad_view"] = solve([obj[j] for j in keep], [img[j] for j in keep], (ho, hi), 0)
    return out

if __name__ == "__main__":
    if sys.argv[1] == "merge":
        res = {}
        for f in sorted(glob.glob("results/part_*.json")):
            for k, v in json.load(open(f)).items(): res.setdefault(k, []).extend(v)
        for v in res.values(): v.sort(key=lambda r: r["session"])
        json.dump(no_nan(dict(opencv=cv2.__version__, sessions_per_case=SESSIONS, views=VIEWS, held_out_views=HELD, true=dict(fx=K[0, 0], cx=K[0, 2], cy=K[1, 2], dist=DIST.tolist(), width=W, height=H), results={c[0]: res[c[0]] for c in CASES})), open("results/sessions.json", "w"), allow_nan=False)
        sys.exit()
    part, parts = int(sys.argv[1]), int(sys.argv[2]); board = Board(); res = {}
    for name, kw, rkw, other in CASES:
        res[name] = [session(name, kw, rkw, other, s, board) for s in range(SESSIONS) if s % parts == part]
        med = lambda k, f="default": np.median([r[f][k] for r in res[name] if r[f]])
        print(name, "rms %.3f worst %.2f held %.3f | k1only rms %.3f worst %.2f | rational rms %.3f worst %.2f held %.3f" % (med("rms"), med("model_worst"), med("held_out_rms"), med("rms", "k1_only"), med("model_worst", "k1_only"), med("rms", "rational_thin_prism"), med("model_worst", "rational_thin_prism"), med("held_out_rms", "rational_thin_prism")), flush=True)
        json.dump(res, open(f"results/part_{part}.json", "w"))
