"""All runs behind the substrate guide. 20 sessions of 20 views per row unless the row says otherwise.

    python run.py            every row, about 25 minutes (the release-object rows take most of it)
    python run.py <id> ...   only these rows; the rest of results/substrate.json is kept

Each row: a board from the shop, one way the real board differs from the nominal one, how large, and whether
the calibration is plain cv2.calibrateCamera or cv2.calibrateCameraRO.
"""
import json, os, sys
import numpy as np, cv2
import lab

SESSIONS = 20
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results", "substrate.json")
IN_PLANE = ["scale", "stretch", "skew", "curve", "random"]
SHAPE = ["bow", "dome", "twist"]

ROWS = []
def row(board, kind, amount, release=False, count=lab.VIEWS, note=""):
    rid = f"{board}/{kind or 'exact'}{note}{'/ro' if release else ''}{'' if count == lab.VIEWS else f'/{count}views'}"
    ROWS.append(dict(id=rid, board=board, kind=kind, amount=amount, release=release, views=count))

for b in lab.BOARDS:                                           # the board exactly as the calibration is told
    row(b, None, 0.0)
for b in lab.BOARDS:                                           # each board at its published limit, one way at a time
    for k in IN_PLANE: row(b, k, lab.position_limit(b), note="/limit")
    for k in SHAPE: row(b, k, lab.flatness_limit(b), note="/limit")
for f in (0.25, 0.5):                                          # does half the deviation cost half as much?
    for k in ("stretch", "curve", "random"): row("composite-300", k, lab.position_limit("composite-300") * f, note=f"/x{f}")
    row("composite-300", "bow", lab.flatness_limit("composite-300") * f, note=f"/x{f}")
row("composite-300", None, 0.0, release=True)                  # the release-object method
for k in IN_PLANE: row("composite-300", k, lab.position_limit("composite-300"), release=True, note="/limit")
for k in SHAPE: row("composite-300", k, lab.flatness_limit("composite-300"), release=True, note="/limit")
row("ceramic-230", None, 0.0, release=True)
row("ceramic-230", "bow", lab.flatness_limit("ceramic-230"), release=True, note="/limit")
for n in (8, 12):                                              # fewer views
    row("composite-300", None, 0.0, count=n); row("composite-300", None, 0.0, release=True, count=n)
    row("composite-300", "bow", lab.flatness_limit("composite-300"), count=n, note="/limit")
    row("composite-300", "bow", lab.flatness_limit("composite-300"), release=True, count=n, note="/limit")
for b in ("composite-300", "composite-800", "ceramic-230"):    # temperature
    row(b, "warm", 10.0, note="/10C")
    row(b, "gradient", 1.0, note="/1C")

if __name__ == "__main__":
    only = set(sys.argv[1:])
    unknown = only - {r["id"] for r in ROWS}
    if unknown: sys.exit(f"no such row: {sorted(unknown)}")
    saved = json.load(open(OUT)) if os.path.exists(OUT) else {"rows": []}
    done = {r["id"]: r for r in saved["rows"]}
    for r in ROWS:
        if only and r["id"] not in only: continue
        s = [lab.session(r["board"], r["kind"], r["amount"], seed, release=r["release"], count=r["views"]) for seed in range(SESSIONS)]
        done[r["id"]] = dict(r, sessions=s)
        print(f"{r['id']:38s} rms {np.median([x['rms'] for x in s]):.3f}  fx {np.median([x['fx_pct'] for x in s]):+.3f} %  "
              f"worst pixel {np.median([x['model_max'] for x in s]):.3f}  distance {np.median([x['distance_pct'] for x in s]):+.3f} %", flush=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    head = dict(opencv=cv2.__version__, camera=dict(width=lab.W, height=lab.H, fx=float(lab.K_TRUE[0, 0]), dist=lab.D_TRUE.tolist()), noise_px=lab.NOISE, sessions=SESSIONS)
    rnd = lambda o: round(o, 5) if isinstance(o, float) else {k: rnd(v) for k, v in o.items()} if isinstance(o, dict) else [rnd(v) for v in o] if isinstance(o, list) else o
    with open(OUT, "w") as f:                                  # one row per line
        f.write("{" + ", ".join(f'"{k}": {json.dumps(v)}' for k, v in head.items()) + ', "rows": [\n')
        f.write(",\n".join(json.dumps(rnd(done[r["id"]]), separators=(",", ":")) for r in ROWS if r["id"] in done) + "\n]}\n")
