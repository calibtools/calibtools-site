"""With all four holes on a rectangle, how often does the layout fit come back turned by 180 degrees?
200 placements, 64 lines, 1.5 to 4 m. Run: python symmetric.py"""
import json, numpy as np
from lab import *
rng = np.random.default_rng(9); turned = usable = 0
for _ in range(200):
    Tcb = placement(rng); Tlb = inv(T_CAM_LIDAR) @ Tcb
    pts, line = scan(Tlb, "64 lines", rng, holes=HOLES_SYMMETRIC)
    c, misfit = find_holes(pts, HOLES_SYMMETRIC, HOLE_R, line)
    if c is None or misfit > 0.01: continue
    usable += 1
    truth = (Tlb[:3, :3] @ HOLES_SYMMETRIC.T).T + Tlb[:3, 3]
    turned += int(np.linalg.norm(c - truth, axis=1).max() > 0.1 and np.linalg.norm(c - truth[::-1], axis=1).max() < 0.02)
json.dump(dict(placements=200, usable=usable, turned_180=turned), open("results/symmetric.json", "w")); print(usable, turned)
