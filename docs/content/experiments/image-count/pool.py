"""Renders and detects the pool of views the sessions are drawn from. Run: python pool.py  (about 1 minute)
Writes results/pool.npz (corners, ids and poses only; the images are not kept)."""
import json, os, time, numpy as np, cv2
from lab import *
N_GOOD, N_LAZY = 400, 120
rng = np.random.default_rng(7)
os.makedirs("/tmp/image-count-session", exist_ok=True)
t0 = time.time()
rows = []
for kind, n, pose in (("good", N_GOOD, good_pose), ("lazy", N_LAZY, lazy_pose)):
    for i in range(n):
        r, t = pose(rng)
        img = render(r, t, rng)
        cc, ci = detect(img)
        if ci is None: continue
        tr = truth(r, t)
        off = float(np.max(np.linalg.norm(cc - tr[ci], axis=1)))
        rows.append(dict(kind=kind, rvec=r, tvec=t, ids=ci, corners=cc, worst_off=off, tilt=float(np.degrees(np.linalg.norm(r[:2])))))
        if (i + 1) % 50 == 0: print(kind, i + 1, f"{time.time()-t0:.0f}s", flush=True)
        if kind == "good" and i < 24:
            cv2.imwrite(f"/tmp/image-count-session/view_{i:02d}.png", img)   # for enough_images.py, not kept
kinds = np.array([r["kind"] for r in rows])
np.savez_compressed("results/pool.npz", opencv=cv2.__version__, kind=kinds,
                    rvec=np.array([r["rvec"] for r in rows]), tvec=np.array([r["tvec"] for r in rows]),
                    tilt=np.array([r["tilt"] for r in rows]), worst_off=np.array([r["worst_off"] for r in rows]),
                    ids=np.array([r["ids"] for r in rows], dtype=object), corners=np.array([r["corners"] for r in rows], dtype=object))
w = np.array([r["worst_off"] for r in rows]); tilt = np.array([r["tilt"] for r in rows])
json.dump(dict(opencv=cv2.__version__, views={k: int((kinds == k).sum()) for k in ("good", "lazy")}, worst_corner_px=float(w.max()),
               share_of_views_within_0_2=float((w < 0.2).mean()), share_of_views_within_0_3=float((w < 0.3).mean()),
               tilt_deg={k: [float(tilt[kinds == k].min()), float(tilt[kinds == k].max())] for k in ("good", "lazy")}),
          open("results/pool_summary.json", "w"), indent=1)
print("saved", len(rows), "views;", "worst corner error", f"{w.max():.3f} px")
