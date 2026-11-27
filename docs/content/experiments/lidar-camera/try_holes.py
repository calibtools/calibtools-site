"""One simulated scan of a panel with four holes by a 32-line LiDAR, and the hole centres found in it.
Save the functions of the guide as pipeline.py next to this file. Needs numpy, scipy and opencv-python."""
import numpy as np
from pipeline import find_holes

HOLES = np.array([[0.17, 0.12, 0], [0.43, 0.12, 0], [0.17, 0.28, 0], [0.40, 0.30, 0]])   # hole centres on the panel, m
RADIUS, PANEL = 0.060, (0.60, 0.40)
rng = np.random.default_rng(0)

# the panel 3 m in front of the LiDAR (x forward, y left, z up), turned 20 degrees about the vertical
c, s = np.cos(np.radians(20)), np.sin(np.radians(20))
R = np.array([[s, 0, c], [-c, 0, s], [0, -1, 0]])          # panel x runs to the right, y down, z away from the LiDAR
origin = np.array([3.0, 0.25, 0.22])                       # the panel's top-left corner

points, ring = [], []
for k, elevation in enumerate(np.radians(np.arange(-16, 16, 1.0))):          # 32 lines, 1 degree apart
    for azimuth in np.radians(np.arange(-15, 15, 0.2)):                      # a return every 0.2 degrees
        ray = np.array([np.cos(elevation) * np.cos(azimuth), np.cos(elevation) * np.sin(azimuth), np.sin(elevation)])
        distance = (origin @ R[:, 2]) / (ray @ R[:, 2])
        x, y, _ = (ray * distance - origin) @ R                              # where the beam meets the panel plane
        on_panel = 0 < x < PANEL[0] and 0 < y < PANEL[1]
        in_hole = (np.hypot(HOLES[:, 0] - x, HOLES[:, 1] - y) < RADIUS).any()
        if on_panel and not in_hole:
            points.append(ray * (distance + rng.normal(0, 0.004))); ring.append(k)   # 4 mm of range noise

found, misfit = find_holes(np.array(points), HOLES, RADIUS, line=np.array(ring))
truth = HOLES @ R.T + origin
print(len(points), "points on", len(set(ring)), "lines")
for f, t in zip(found, truth):
    print("hole at", np.round(t, 3), " found", np.round(f, 3), " off by %.1f mm" % (1000 * np.linalg.norm(f - t)))
print("rim misfit %.1f mm" % (1000 * misfit))
