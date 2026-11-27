"""500 looks at the chart for each case. Run: python run.py   (a few minutes)"""
import json, numpy as np
from lab import *
LOOKS = 500
CASES = [dict(name="pixels only", blur=0.0)] + [dict(name=f"blur {b}", blur=b) for b in (0.3, 0.5, 0.8, 1.2, 2.0)]
CASES += [dict(name=f"blur 0.5, threshold {t}", blur=0.5, threshold=t) for t in (0.02, 0.05, 0.2, 0.3)]
CASES += [dict(name=f"blur 0.5, noise {n}", blur=0.5, noise=n) for n in (0.01, 0.03)]
CASES += [dict(name=f"blur 0.5, chart contrast {c}", blur=0.5, chart_contrast=c) for c in (0.5, 0.2)]
CASES += [dict(name=f"blur 1.2, threshold {t}", blur=1.2, threshold=t) for t in (0.02, 0.05, 0.2, 0.3)]
out = dict(freqs_cycles_per_pixel=[float(f) for f in FREQS], nyquist_index=NYQUIST_INDEX, looks=LOOKS, cases={})
for ci, c in enumerate(CASES):
    kw = {k: v for k, v in c.items() if k not in ("name", "blur")}
    rng = np.random.default_rng([1, ci])
    counts = np.array([one_look(c["blur"], rng, **kw) for _ in range(LOOKS)])
    out["cases"][c["name"]] = dict(blur=c["blur"], threshold=kw.get("threshold", 0.1), noise=kw.get("noise", 0.0),
        chart_contrast=kw.get("chart_contrast", 1.0), counts=counts.tolist())
    r = np.array([reading(k) for k in counts])
    print(c["name"], "reading min/median/max", r.min(), int(np.median(r)), r.max(), " three bars per element %:", (100 * (counts == 3).mean(axis=0)).round(0).astype(int).tolist(), flush=True)
json.dump(out, open("results/looks.json", "w"))
