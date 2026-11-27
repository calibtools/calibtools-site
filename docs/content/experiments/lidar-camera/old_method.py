"""The earlier hole finder on the same kind of placements: how often it returned four holes that match the layout within
20 mm, and how far off the centres were. 200 placements per row, cell = 10 mm as the earlier guide suggested.
Run: python old_method.py"""
import json, numpy as np
import old_method_code as old
from lab import *
rows = []
for lidar in LIDARS:
    for distance in ((1.5, 2.5), (2.5, 4.0)):
        rng = np.random.default_rng([0, int(distance[0] * 10)]); err = []          # the same placements as detect.py
        for _ in range(200):
            Tcb = placement(rng, distance); Tlb = inv(T_CAM_LIDAR) @ Tcb
            pts, line = scan(Tlb, lidar, rng)
            try: c = old.find_holes(pts, HOLE_R, cell=0.01) if len(pts) >= 30 else []
            except Exception: c = []
            if len(c) != 4: continue
            res, _, order = old.match_holes(c, HOLES)
            e = float(1000 * np.linalg.norm(c - ((Tlb[:3, :3] @ HOLES[order].T).T + Tlb[:3, 3]), axis=1).max())
            if e <= 20: err.append(round(e, 2))
        rows.append(dict(lidar=lidar, distance=list(distance), placements=200, usable=len(err), centre_err_mm=err))
        print(lidar, distance, "usable", len(err), "median err", round(float(np.median(err)), 1) if err else None, flush=True)
json.dump(dict(cell_m=0.01, rows=rows), open("results/old_method.json", "w"), separators=(",", ":"))
