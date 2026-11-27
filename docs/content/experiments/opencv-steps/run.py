"""20 sessions of 20 views for each way of taking the images, ChArUco board.
Run: python run.py 0 2 & python run.py 1 2 ; wait ; python run.py merge"""
import json, sys, glob, numpy as np, cv2
from lab import *
SESSIONS, VIEWS = 20, 20
#        name               pose keywords
ARMS = [("as_in_the_guide",  dict(tilt=(5, 45), distance=(0.8, 1.25))),
        ("tilt_under_5",     dict(tilt=(0, 5),  distance=(0.8, 1.25))),
        ("tilt_under_5_one_distance", dict(tilt=(0, 5), distance=(1.0, 1.0))),
        ("tilt_15_to_25",    dict(tilt=(15, 25), distance=(0.8, 1.25))),
        ("tilt_40_to_60",    dict(tilt=(40, 60), distance=(0.8, 1.25))),
        ("one_distance",     dict(tilt=(5, 45), distance=(1.0, 1.0))),
        ("middle_only",      dict(tilt=(5, 45), distance=(0.8, 1.25), place="centre"))]
FLAGS = dict(default=0, rational=cv2.CALIB_RATIONAL_MODEL, fewer=cv2.CALIB_FIX_K3 | cv2.CALIB_ZERO_TANGENT_DIST)

def solve(obj, img, flags=0):
    try: rms, K2, d2, _, _ = cv2.calibrateCamera(obj, img, (W, H), None, None, flags=flags)
    except cv2.error: return None
    mean, worst = model_error(K2, d2)
    return dict(rms=rms, model_mean=mean, model_worst=worst, fx=K2[0, 0], fy=K2[1, 1], cx=K2[0, 2], cy=K2[1, 2])

def session(name, kw, s, board):
    rng = np.random.default_rng([11, ARM_INDEX[name], s]); obj, img, views_tried = [], [], 0
    for _ in range(VIEWS):
        r, t = pose(board, rng, **kw); views_tried += 1
        cc, ci = detect_charuco(board, render(board, r, t, rng))
        if cc is None: continue
        obj.append(board.corners[ci].astype(np.float32)); img.append(cc.astype(np.float32))
    out = dict(session=s, views=len(obj), corners=int(sum(len(o) for o in obj)))
    for k, f in FLAGS.items(): out[k] = solve(obj, img, f) if len(obj) >= 3 else None
    return out

ARM_INDEX = {n: i for i, (n, _) in enumerate(ARMS)}
if __name__ == "__main__":
    if sys.argv[1] == "merge":
        res = {}
        for f in sorted(glob.glob("results/part_*.json")):
            for k, v in json.load(open(f)).items(): res.setdefault(k, []).extend(v)
        for v in res.values(): v.sort(key=lambda r: r["session"])
        json.dump(dict(opencv=cv2.__version__, sessions_per_arm=SESSIONS, views=VIEWS, true=dict(fx=K[0, 0], fy=K[1, 1], cx=K[0, 2], cy=K[1, 2], width=W, height=H), results={n: res[n] for n, _ in ARMS}), open("results/sessions.json", "w"))
        sys.exit()
    part, parts = int(sys.argv[1]), int(sys.argv[2]); board = Board(); res = {}
    for name, kw in ARMS:
        res[name] = [session(name, kw, s, board) for s in range(SESSIONS) if s % parts == part]
        d = [r["default"] for r in res[name] if r["default"]]
        print(name, "views", np.median([r["views"] for r in res[name]]), "worst px", np.median([x["model_worst"] for x in d]).round(3), "fx err %", np.median([100 * abs(x["fx"] - K[0, 0]) / K[0, 0] for x in d]).round(3), flush=True)
        json.dump(res, open(f"results/part_{part}.json", "w"))
