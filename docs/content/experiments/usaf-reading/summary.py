"""Reads results/looks.json and prints what the guide quotes. Run: python summary.py"""
import json, numpy as np
from lab import FREQS, NYQUIST_INDEX, system_mtf, reading
d = json.load(open("results/looks.json"))
def mtf50(blur):
    f = np.linspace(0.001, 1, 100000); return float(f[np.argmin(np.abs(system_mtf(f, blur) - 0.5))])
for name, c in d["cases"].items():
    counts = np.array(c["counts"]); r = np.array([reading(k) for k in counts])
    lo, med, hi = int(r.min()), int(np.median(r)), int(r.max())
    rel = lambda i: FREQS[i] / 0.5
    above = (counts[:, NYQUIST_INDEX + 1:] == 3).any(axis=1).mean()
    half = len(r) // 2; differ = (r[:half] != r[half:2 * half]).mean()
    print(f"{name}: reading {rel(lo):.2f} / {rel(med):.2f} / {rel(hi):.2f} x Nyquist (elements {lo}..{hi}); "
          f"MTF at median reading {system_mtf(FREQS[med], c['blur']):.2f}, one element finer {system_mtf(FREQS[med + 1], c['blur']):.2f}; "
          f"reading / MTF50 {FREQS[med] / mtf50(c['blur']):.2f}; three bars above Nyquist in {100 * above:.0f} % of looks; two looks differ {100 * differ:.0f} %")
