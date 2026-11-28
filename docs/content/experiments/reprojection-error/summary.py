"""Prints what the guide quotes from results/sessions.json. Run: python summary.py > results/summary.txt"""
import json, numpy as np
d = json.load(open("results/sessions.json")); R = d["results"]; fx = d["true"]["fx"]
med = lambda rows, k, f="default": float(np.median([r[f][k] for r in rows if r.get(f)]))
print("case | views | RMS | held-out RMS | model worst px | straight edge px | fx error px | fx std from solver | k1-only RMS, worst | rational RMS, worst, held-out, edge")
for name, rows in R.items():
    edge = lambda f="default": float(np.median([r[f]["straight_edge"][0] for r in rows if r.get(f)]))
    print(f"{name} | {np.median([r['views'] for r in rows]):.0f} | {med(rows,'rms'):.3f} | {med(rows,'held_out_rms'):.3f} | {med(rows,'model_worst'):.2f} | {edge():.2f} | "
          f"{np.median([abs(r['default']['fx']-fx) for r in rows]):.2f} | {med(rows,'fx_std'):.2f} | {med(rows,'rms','k1_only'):.3f}, {med(rows,'model_worst','k1_only'):.2f} | "
          f"{med(rows,'rms','rational_thin_prism'):.3f}, {med(rows,'model_worst','rational_thin_prism'):.2f}, {med(rows,'held_out_rms','rational_thin_prism'):.3f}, {edge('rational_thin_prism'):.2f}")
print()
print("per-view check: case | largest view / median view (median of sessions) | sheared view is the largest | sheared view above 3x median | another view above 3x | model worst after removing it")
for name, rows in R.items():
    ratio, top, flagged, other = [], 0, 0, 0
    for r in rows:
        pv = np.array(r["default"]["per_view"]); m = np.median(pv); ratio.append(pv.max() / m); over = pv > 3 * m
        if r["bad_view"] is not None:
            top += int(pv.argmax() == r["bad_view"]); flagged += int(over[r["bad_view"]]); over[r["bad_view"]] = False
        other += int(over.any())
    after = [r["without_bad_view"]["model_worst"] for r in rows if r.get("without_bad_view")]
    print(f"{name} | {np.median(ratio):.1f} | {top} | {flagged} | {other} | {np.median(after):.2f}" if after else f"{name} | {np.median(ratio):.1f} | - | - | {other} | -")
print()
print("radius rings (0-300, 300-600, 600-900, 900-1200 px), mean error over all sessions' corners: case, model | corners | mean px")
for name in ("good", "middle_only", "bowed_1mm"):
    for f in ("default", "k1_only"):
        n = np.sum([[b["corners"] for b in r[f]["radius"]] for r in R[name]], axis=0)
        s = np.sum([[b["corners"] * (b["mean"] or 0) for b in r[f]["radius"]] for r in R[name]], axis=0)
        print(name, f, "|", n.tolist(), "|", [round(float(a / b), 3) if b else None for a, b in zip(s, n)])
