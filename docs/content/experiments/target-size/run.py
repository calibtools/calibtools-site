"""20 sessions of 20 images for each way of showing the board. Run: python run.py   (about 30 minutes; `python run.py 0 2` and
`python run.py 1 2` in two terminals halve that, then `python run.py merge`)."""
import json, sys, glob, numpy as np, cv2
from lab import *
SESSIONS, VIEWS = 20, 20
#        name                fill  place       tilt      board
ARMS = [("spread_20",        0.20, "spread",   (5, 35), (14, 9)),
        ("spread_30",        0.30, "spread",   (5, 35), (14, 9)),
        ("spread_45",        0.45, "spread",   (5, 35), (14, 9)),
        ("spread_60",        0.60, "spread",   (5, 35), (14, 9)),
        ("spread_80",        0.80, "spread",   (5, 35), (14, 9)),
        ("centre_20",        0.20, "centre",   (5, 35), (14, 9)),
        ("centre_30",        0.30, "centre",   (5, 35), (14, 9)),
        ("centre_45",        0.45, "centre",   (5, 35), (14, 9)),
        ("centre_60",        0.60, "centre",   (5, 35), (14, 9)),
        ("overhang_60",      0.60, "overhang", (5, 35), (14, 9)),
        ("overhang_80",      0.80, "overhang", (5, 35), (14, 9)),
        ("overhang_100",     1.00, "overhang", (5, 35), (14, 9)),
        ("dense_60",         0.60, "spread",   (5, 35), (28, 18)),
        ("dense_30",         0.30, "spread",   (5, 35), (28, 18)),
        ("flat_60",          0.60, "spread",   (0, 10), (14, 9))]
FEWER = cv2.CALIB_FIX_K3 | cv2.CALIB_ZERO_TANGENT_DIST

def solve(obj, img, flags=0):
    try: rms, K2, d2, _, _ = cv2.calibrateCamera(obj, img, (W, H), None, None, flags=flags)
    except cv2.error: return None
    mean, worst = model_error(K2, d2)
    return dict(rms=rms, model_mean=mean, model_worst=worst, focal_err_pct=100 * abs(K2[0, 0] - K[0, 0]) / K[0, 0])

def session(arm, s, boards):
    name, fill, place, tilt, shape = arm
    b = boards[shape]; rng = np.random.default_rng([ARMS.index(arm), s])
    obj, img, corner_err, cover = [], [], [], np.zeros((6, 8), bool)
    for _ in range(VIEWS):
        r, t = pose(b, fill, rng, place, tilt)
        cc, ci = detect(b, render(b, r, t, rng))
        if ci is None: continue
        obj.append(b.corners[ci].astype(np.float32)); img.append(cc.astype(np.float32))
        corner_err.append(np.linalg.norm(cc - project(b.corners, r, t)[ci], axis=1))
        cover[np.clip((cc[:, 1] / H * 6).astype(int), 0, 5), np.clip((cc[:, 0] / W * 8).astype(int), 0, 7)] = True
    e = np.concatenate(corner_err) if corner_err else np.array([np.nan])
    out = dict(session=s, views=len(obj), corners=int(sum(len(o) for o in obj)), corner_err_median=None if not corner_err else float(np.median(e)),
               frame_cells_reached=int(cover.sum()), default=None, fewer=None)
    if len(obj) >= 4:
        out["default"] = solve(obj, img); out["fewer"] = solve(obj, img, FEWER)
    return out

if __name__ == "__main__":
    if sys.argv[1:2] == ["merge"]:
        arms = {}
        for f in sorted(glob.glob("results/part_*.json")):
            for k, v in json.load(open(f)).items(): arms.setdefault(k, []).extend(v)
        for v in arms.values(): v.sort(key=lambda x: x["session"])
        meta = {a[0]: dict(fill=a[1], place=a[2], tilt_deg=a[3], board=a[4], px_per_square=round(a[1] * W / a[4][0], 1)) for a in ARMS}
        json.dump(dict(opencv=cv2.__version__, image=[W, H], sessions_per_arm=SESSIONS, views=VIEWS, arms=meta, results=arms), open("results/sessions.json", "w"), indent=1)
        print({k: len(v) for k, v in arms.items()}); sys.exit()
    part, parts = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (0, 1)
    boards = {(14, 9): Board(14, 9), (28, 18): Board(28, 18)}
    out = {}
    for arm in ARMS:
        out[arm[0]] = [session(arm, s, boards) for s in range(SESSIONS) if s % parts == part]
        d = [x["default"]["model_worst"] for x in out[arm[0]] if x["default"]]
        print(arm[0], "views", np.median([x["views"] for x in out[arm[0]]]), "worst px median", round(float(np.median(d)), 3) if d else None, flush=True)
        json.dump(out, open(f"results/part_{part}.json", "w"))
