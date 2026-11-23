"""Table for the article: 20 random sessions per kind of motion, two spoiled images out of 24. Medians."""
import sys, json; sys.argv = [sys.argv[0], sys.argv[1]]
from lab import *
T = SAMPLE; N = 20
CASES = [
 ("still", None),
 ("global 4 mm, even", lambda r, t, g, s: exposure(T, r, t, g, (4.0 * s, 0, 0))),
 ("global 4 mm, uneven", lambda r, t, g, s: exposure(T, r, t, g, (4.0 * s, 0, 0), ramp=0.8)),
 ("rolling 0.25 mm sideways", lambda r, t, g, s: rolling(T, r, t, g, (0.25 * s, 0, 0))),
 ("rolling 0.5 mm sideways", lambda r, t, g, s: rolling(T, r, t, g, (0.5 * s, 0, 0))),
 ("rolling 1 mm sideways", lambda r, t, g, s: rolling(T, r, t, g, (1.0 * s, 0, 0))),
 ("rolling 2 mm sideways", lambda r, t, g, s: rolling(T, r, t, g, (2.0 * s, 0, 0))),
 ("rolling 4 mm sideways", lambda r, t, g, s: rolling(T, r, t, g, (4.0 * s, 0, 0))),
 ("rolling 2 mm up or down", lambda r, t, g, s: rolling(T, r, t, g, (0, 2.0 * s, 0))),
 ("rolling 4 mm along the view", lambda r, t, g, s: rolling(T, r, t, g, (0, 0, 4.0 * s))),
 ("rolling 0.5 deg turn", lambda r, t, g, s: rolling(T, r, t, g, rot_deg=0.5 * s)),
]
import os
sel = os.environ.get('CASES_SEL'); tag = os.environ.get('TAG', '')
out = {}
for ci, (name, maker) in enumerate(CASES):
    if sel and str(ci) not in sel.split(','): continue
    rows = []
    for seed in range(1, N + 1):
        poses = synth.sample_poses(T, CAM, 24, seed); rng = np.random.default_rng(5000 + seed)
        bad = tuple(sorted(rng.choice(24, 2, replace=False).tolist())); sg = {b: int(rng.choice([-1, 1])) for b in bad}
        imgs = [maker(r, t, rng, sg[i]) if (maker and i in bad) else still(T, r, t, rng) for i, (r, t) in enumerate(poses)]
        d = session(T, poses, imgs); a, _ = solve(T, d); wo, _ = solve(T, d, bad)
        usable_bad = sum(d[b].usable for b in bad)
        order = sorted(a['per'], key=lambda k: -a['per'][k]); bars = [a['per'].get(b) for b in bad if b in a['per']]
        med = float(np.median(list(a['per'].values())))
        rows.append(dict(seed=seed, usable_bad=usable_bad, rms=a['rms'], rms_wo=wo['rms'], lens=a['lens_mean'], lens_max=a['lens_max'], lens_wo=wo['lens_mean'], lens_max_wo=wo['lens_max'],
                         dfx=abs(a['fx'] - 1500), dpp=float(np.hypot(a['cx'] - 640, a['cy'] - 480)), dpp_wo=float(np.hypot(wo['cx'] - 640, wo['cy'] - 480)),
                         bar_ratio=(float(np.mean(bars)) / med if bars else None), bar_min_ratio=(min(bars) / med if bars else None),
                         top2=(sorted(order[:2]) == list(bad)) if len(bars) == 2 else None, flagged_hit=len(set(a['flagged']) & set(bad)), flagged_extra=len(set(a['flagged']) - set(bad)),
                         shear_px=float(np.mean([px_of(1.0, poses[b][1][2]) for b in bad]))))
    out[name] = rows; json.dump(out, open(f"results/table{tag}.json", "w"), indent=1)
    m = lambda k: float(np.median([r[k] for r in rows if r[k] is not None])) if any(r[k] is not None for r in rows) else float('nan')
    print(f"{name:30s} rms {m('rms'):.3f} wo {m('rms_wo'):.3f} | lens {m('lens'):.3f}/{m('lens_max'):.3f} wo {m('lens_wo'):.3f} | dfx {m('dfx'):.2f} dpp {m('dpp'):.2f} wo {m('dpp_wo'):.2f} | bar/median {m('bar_ratio'):.1f} min {m('bar_min_ratio'):.1f} top2 {sum(bool(r['top2']) for r in rows)}/{N} flagged {sum(r['flagged_hit'] for r in rows)}/{2*N} extra {sum(r['flagged_extra'] for r in rows)} usable_bad {sum(r['usable_bad'] for r in rows)}"); sys.stdout.flush()
