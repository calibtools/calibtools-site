"""200 simulated calibrations for each case. Run: python run.py 2>/dev/null   (about 4 minutes; OpenCV prints a line to stderr
each time its Tsai solver gives up)."""
import json, numpy as np, cv2
from lab import *
N = 200
GOOD, ROUGH = (0.05, 0.01), (0.5, 0.05)            # robot reading error: mm and degrees, one standard deviation per axis
r4 = lambda v: None if v is None else round(float(v), 4)

def step_angle(poses):
    """Median rotation between one flange pose and the next, degrees."""
    a = [np.degrees(np.arccos(np.clip((np.trace(p[:3, :3].T @ q[:3, :3]) - 1) / 2, -1, 1))) for p, q in zip(poses, poses[1:])]
    return float(np.median(a))

def run(name, methods=("Park",), seed=0, bad=None, eye_to_hand=False, **kw):
    rows = []
    for s in range(N):
        rng = np.random.default_rng([seed, s])
        if eye_to_hand:
            rg, tc = session_eye_to_hand(rng, **kw); rg = [inv(m) for m in rg]; step = None
        else:
            tg, rg, tc = session(rng, **kw); step = step_angle(tg)
        row = dict(step_deg=r4(step))
        if bad is not None:                         # one robot reading is wrong by `bad` mm
            k = int(rng.integers(len(rg))); d = rng.normal(size=3); rg[k] = rg[k].copy(); rg[k][:3, 3] += bad * d / np.linalg.norm(d)
        for m in methods:
            X = solve(rg, tc, m)
            row[m] = None if X is None else [r4(e) for e in errors(X)]
        X = solve(rg, tc, "Park")
        if X is not None:
            dev = target_spread(X, rg, tc); row["spread_mean"] = r4(dev.mean()); row["spread_max"] = r4(dev.max())
            if bad is not None:
                row["flagged"] = bool(int(np.argmax(dev)) == k)
                keep = [i for i in range(len(rg)) if i != int(np.argmax(dev))]
                X2 = solve([rg[i] for i in keep], [tc[i] for i in keep], "Park")
                row["after_drop"] = None if X2 is None else [r4(e) for e in errors(X2)]
        rows.append(row)
    ok = [r["Park"][2] for r in rows if r.get("Park")]
    print(f"{name:22s} Park solved {len(ok):3d}  point error median {np.median(ok) if ok else float('nan'):.3f} mm", flush=True)
    return rows

ALL = tuple(METHODS)
out = {}
for robot, tag in ((GOOD, "good"), (ROUGH, "rough")):
    for n in (3, 4, 6, 10, 15, 20, 30, 50):
        out[f"poses_{n}_{tag}"] = run(f"poses_{n}_{tag}", n=n, robot=robot, seed=1)
for a in (2, 5, 10, 20, 30, 45):
    out[f"tilt_{a}"] = run(f"tilt_{a}", methods=ALL, max_tilt=a, roll=a, seed=2)
out["one_axis"] = run("one_axis", methods=ALL, axes="one", seed=3)
out["translate_only"] = run("translate_only", methods=ALL, translate_only=True, seed=4)
for px in (0.03, 0.1, 0.3, 1.0):
    out[f"pixel_{px}"] = run(f"pixel_{px}", pixel_noise=px, seed=5)
Kbad = K.copy(); Kbad[0, 0] *= 1.005; Kbad[1, 1] *= 1.005
out["focal_plus_0.5pct"] = run("focal_plus_0.5pct", Kc=Kbad, seed=6)
out["no_distortion_model"] = run("no_distortion_model", dist=np.zeros(5), seed=6)
out["square_plus_1pct"] = run("square_plus_1pct", square_scale=1.01, seed=6)
out["baseline_seed6"] = run("baseline_seed6", seed=6)
for mm in (2, 5, 20):
    out[f"bad_pose_{mm}mm"] = run(f"bad_pose_{mm}mm", bad=mm, seed=7)
out["eye_to_hand_good"] = run("eye_to_hand_good", eye_to_hand=True, robot=GOOD, seed=8)
out["eye_to_hand_rough"] = run("eye_to_hand_rough", eye_to_hand=True, robot=ROUGH, seed=8)
json.dump(dict(opencv=cv2.__version__, sessions=N, robot=dict(good=GOOD, rough=ROUGH), defaults=dict(n=20, max_tilt=30, roll=30, pixel_noise=0.1, robot="good"),
               cases=out), open("results/sessions.json", "w"), separators=(",", ":"))
