import sys, json; sys.argv = [sys.argv[0], sys.argv[1]]
from lab import *
out = {}
def summarize(tag, rows):
    A = lambda k: np.array([r[k] for r in rows], float)
    s = {k: float(A(k).mean()) for k in rows[0] if k not in ('seed',)}
    out[tag] = dict(mean=s, rows=rows); json.dump(out, open("results/harder_cases.json", "w"), indent=1); print(tag, json.dumps({k: round(v, 3) for k, v in s.items()})); sys.stdout.flush()
# E5: every image moves a little (rolling), random direction in the image plane, size uniform 0..s
T = SAMPLE
for s_mm in (0.0, 0.5, 1.0, 2.0):
    rows = []
    for seed in range(1, 11):
        poses = synth.sample_poses(T, CAM, 24, seed); rng = np.random.default_rng(7000 + seed); imgs = []
        for r, t in poses:
            a = rng.uniform(0, 2 * np.pi); m = rng.uniform(0, s_mm)
            imgs.append(rolling(T, r, t, rng, (m * np.cos(a), m * np.sin(a), 0)) if s_mm else still(T, r, t, rng))
        a, _ = solve(T, session(T, poses, imgs)); bars = np.array(list(a['per'].values()))
        rows.append(dict(seed=seed, rms=a['rms'], lens_mean=a['lens_mean'], lens_max=a['lens_max'], dfx=abs(a['fx'] - 1500), dcx=abs(a['cx'] - 640), dcy=abs(a['cy'] - 480),
                         bar_max=float(bars.max()), bar_median=float(np.median(bars)), flagged=len(a['flagged'])))
    summarize(f"all images move up to {s_mm} mm", rows)
# E5b: along the optical axis only, two images (the hidden case)
for mm in (2.0, 4.0, 8.0):
    rows = []
    for seed in range(1, 11):
        poses = synth.sample_poses(T, CAM, 24, seed); rng = np.random.default_rng(5000 + seed)
        bad = tuple(sorted(rng.choice(24, 2, replace=False).tolist())); sg = {b: rng.choice([-1, 1]) for b in bad}
        imgs = [rolling(T, r, t, rng, (0, 0, mm * sg[i])) if i in bad else still(T, r, t, rng) for i, (r, t) in enumerate(poses)]
        d = session(T, poses, imgs); a, _ = solve(T, d); wo, _ = solve(T, d, bad); order = sorted(a['per'], key=lambda k: -a['per'][k])
        rows.append(dict(seed=seed, rms=a['rms'], lens_mean=a['lens_mean'], lens_max=a['lens_max'], lens_mean_wo=wo['lens_mean'], dcx=abs(a['cx'] - 640), dcy=abs(a['cy'] - 480),
                         top2=float(sorted(order[:2]) == list(bad)), flagged_hit=len(set(a['flagged']) & set(bad)), bar_min=min(a['per'][b] for b in bad)))
    summarize(f"two images move {mm} mm along the optical axis", rows)
# E6: other boards, two images 2 mm sideways
for name, TT in (("checkerboard 10x7, 30 mm", Target(CHECKERBOARD, 10, 7, 30.0)), ("ChArUco 12x9, 60 mm", Target(CHARUCO, 12, 9, 60.0, 45.0, "DICT_5X5_1000"))):
    rows = []
    for seed in range(1, 7):
        poses = synth.sample_poses(TT, CAM, 24, seed); rng = np.random.default_rng(5000 + seed)
        bad = tuple(sorted(rng.choice(24, 2, replace=False).tolist())); sg = {b: rng.choice([-1, 1]) for b in bad}
        clean = [still(TT, r, t, rng) for r, t in poses]; imgs = list(clean)
        for b in bad: imgs[b] = rolling(TT, *poses[b], rng, (2.0 * sg[b], 0, 0))
        base, _ = solve(TT, session(TT, poses, clean)); d = session(TT, poses, imgs); a, _ = solve(TT, d); wo, _ = solve(TT, d, bad)
        order = sorted(a['per'], key=lambda k: -a['per'][k])
        rows.append(dict(seed=seed, usable=float(sum(x.usable for x in d)), z=float(np.mean([poses[b][1][2] for b in bad])), rms_clean=base['rms'], rms=a['rms'], rms_wo=wo['rms'], lens_clean=base['lens_mean'], lens=a['lens_mean'], lens_wo=wo['lens_mean'],
                         top2=float(sorted(order[:2]) == list(bad)), flagged_hit=len(set(a['flagged']) & set(bad))))
    summarize(name, rows)
json.dump(out, open("results/harder_cases.json", "w"), indent=1)
