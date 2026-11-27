"""One placement at a time: how often does each LiDAR pattern give all four hole centres, and how good are they?
200 placements per row. Run: python detect.py   (about 6 minutes)"""
import json, numpy as np
from lab import *
N = 200
rows = []
def row(lidar, distance, hole_r=HOLE_R, seed=0, **scan_kw):
    rng = np.random.default_rng([seed, int(distance[0] * 10)]); err = []
    for _ in range(N):
        Tcb = placement(rng, distance); Tlb = inv(T_CAM_LIDAR) @ Tcb
        pts, line = scan(Tlb, lidar, rng, hole_r=hole_r, **scan_kw)
        c, misfit = find_holes(pts, HOLES, hole_r, line) if len(pts) >= 30 else (None, np.inf)
        if c is None or misfit > 0.01: continue
        err.append(float(1000 * np.linalg.norm(c - ((Tlb[:3, :3] @ HOLES.T).T + Tlb[:3, 3]), axis=1).max()))
    rows.append(dict(lidar=lidar, distance=list(distance), hole_diameter_mm=round(2000 * hole_r), placements=N, usable=len(err),
                     wrong=int(sum(e > 20 for e in err)), centre_err_mm=[round(e, 2) for e in err], **{k: v for k, v in scan_kw.items()}))
    print(lidar, distance, round(2000 * hole_r), scan_kw, "usable", len(err), "median err", round(float(np.median(err)), 2) if err else None, "over 20 mm", rows[-1]["wrong"], flush=True)
for lidar in LIDARS:
    for distance in ((1.5, 2.5), (2.5, 4.0), (4.0, 6.0), (6.0, 8.0)): row(lidar, distance)
for d in (0.02, 0.04):
    for lidar in ("16 lines", "64 lines", "dense"):
        for distance in ((1.5, 2.5), (2.5, 4.0)): row(lidar, distance, hole_r=d, seed=1)
json.dump(dict(placements_per_row=N, rows=rows), open("results/detect.json", "w"), separators=(",", ":"))
