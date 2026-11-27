"""Data for the guide's first figure: where the board sat in the 20 images of session 0, held in the middle and moved around,
with the medians of the 20 sessions. Run from the repository root: python docs/content/experiments/target-size/figure.py, then pnpm guides:figures."""
import json, os, sys, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from lab import *
from run import ARMS, VIEWS
res = json.load(open(os.path.join(os.path.dirname(__file__), "results/sessions.json")))["results"]
b = Board(14, 9); cases = []
for key, name in [("middle", "centre_20"), ("moved", "spread_20")]:
    arm = next(a for a in ARMS if a[0] == name); rng = np.random.default_rng([ARMS.index(arm), 0]); outlines = []
    for _ in range(VIEWS):
        r, t = pose(b, arm[1], rng, arm[2], arm[3])
        outlines.append([[round(float(x), 1), round(float(y), 1)] for x, y in project(b.outline, r, t)])
        rng.normal(0, 2.0, (H, W))                      # the noise render() draws, so the next pose is the one the session used
    ok = [s["default"] for s in res[name]]
    cases.append(dict(key=key, arm=name, fill_pct=round(100 * arm[1]), outlines=outlines,
                      rms=float(np.median([o["rms"] for o in ok])), model_worst=float(np.median([o["model_worst"] for o in ok]))))
json.dump(dict(image=[W, H], cases=cases), open("src/data/target-size-placement.json", "w"), indent=1)
print([(c["key"], round(c["rms"], 3), round(c["model_worst"], 2)) for c in cases])
