"""Writes the 20 images of session 0 of 'spread_20' and of 'centre_20' to /tmp/target-size-moved and /tmp/target-size-middle,
the two folders coverage.py was run on for the guide."""
import os, numpy as np, cv2
from lab import *
from run import ARMS, VIEWS
b = Board(14, 9)
for name, folder in [("spread_20", "/tmp/target-size-moved"), ("centre_20", "/tmp/target-size-middle")]:
    arm = next(a for a in ARMS if a[0] == name); rng = np.random.default_rng([ARMS.index(arm), 0])
    os.makedirs(folder, exist_ok=True)
    for i in range(VIEWS):
        r, t = pose(b, arm[1], rng, arm[2], arm[3])
        cv2.imwrite(f"{folder}/view_{i:02d}.png", render(b, r, t, rng))
