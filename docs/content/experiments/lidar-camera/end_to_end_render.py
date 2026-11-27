"""The renderer of the end-to-end check: the panel with its four markers and four holes, seen through the camera of lab.py."""
import numpy as np, cv2
from lab import *
aruco = cv2.aruco; D = aruco.getPredefinedDictionary(aruco.DICT_5X5_100); PX = 4000           # texture pixels per meter
tex = np.full((int(PANEL[1] * PX), int(PANEL[0] * PX)), 235, np.uint8)
for i, (x, y) in enumerate(MARKER_ORIGINS):
    m = aruco.generateImageMarker(D, i, int(MARKER * PX)); tex[int(y * PX):int(y * PX) + m.shape[0], int(x * PX):int(x * PX) + m.shape[1]] = m
for h in HOLES: cv2.circle(tex, (int(h[0] * PX), int(h[1] * PX)), int(HOLE_R * PX), 60, -1)        # through the hole: the dark wall behind
tex = cv2.GaussianBlur(tex.astype(np.float32), (0, 0), 1.5)
u, v = np.meshgrid(np.arange(W, dtype=np.float64), np.arange(H, dtype=np.float64))
n = cv2.undistortPoints(np.stack([u.ravel(), v.ravel()], 1).reshape(-1, 1, 2), K, DIST).reshape(-1, 2); RAYS = np.hstack([n, np.ones((len(n), 1))])

def render(M, rng):
    R, t = M[:3, :3], M[:3, 3]; nrm = R[:, 2]
    s = (t @ nrm) / (RAYS @ nrm); p = (RAYS * s[:, None] - t) @ R
    mx = (p[:, 0] * PX - 0.5).astype(np.float32).reshape(H, W); my = (p[:, 1] * PX - 0.5).astype(np.float32).reshape(H, W)
    scale = PX * float(np.median(s)) / K[0, 0]
    out = cv2.remap(cv2.GaussianBlur(tex, (0, 0), 0.5 * scale) if scale > 1.5 else tex, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=60.0)
    return np.clip(cv2.GaussianBlur(out, (0, 0), 0.8) + rng.normal(0, 2, (H, W)), 0, 255).astype(np.uint8)

