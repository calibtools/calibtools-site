"""Synthetic test for the guide "Why your printed target is costing you 0.5 px".

A known camera views a ChArUco-sized corner grid (10 x 7 inner corners, 24 mm
squares, 264 x 192 mm, i.e. an A4 print) in 20 poses. The *true* board is
deformed (scaled, stretched in one direction, bowed, or wavy); the calibration
is run with the *nominal* flat board, as happens when a printed sheet is
described by its file parameters. Detection noise: Gaussian, sigma 0.05 px.

Reported per scenario (median over 30 random pose sets):
  RMS          reprojection error from cv2.calibrateCamera
  fx err       focal length error, %
  fy/fx err    aspect ratio error, %
  edge err     how far the fitted model is from the true one at the frame
               corners: rays of the true model through the 4 corner pixels,
               projected with the fitted model (px, max of 4)
  dist err     error of the camera-to-board distance, % (mean over views)

Run:  python3 -I printed-target-sim.py
"""
import numpy as np
import cv2

W, H = 2448, 2048                      # 5 MP machine-vision sensor
K_TRUE = np.array([[3478.0, 0, 1224.0], [0, 3478.0, 1024.0], [0, 0, 1]])  # 12 mm lens, 3.45 µm pixels
D_TRUE = np.array([-0.12, 0.08, 0.0004, -0.0003, 0.0])
COLS, ROWS, SQ = 10, 7, 24.0           # inner corners, square mm
NOISE = 0.05
N_VIEWS, N_TRIALS = 20, 30

gx, gy = np.meshgrid(np.arange(COLS) * SQ, np.arange(ROWS) * SQ)
NOMINAL = np.stack([gx.ravel(), gy.ravel(), np.zeros(gx.size)], 1).astype(np.float64)
L, S = (COLS - 1) * SQ, (ROWS - 1) * SQ     # 216 x 144 mm corner span
CX, CY = L / 2, S / 2


def deform(kind, v):
    p = NOMINAL.copy()
    x, y = p[:, 0] - CX, p[:, 1] - CY
    if kind == 'scale':
        p[:, :2] = np.stack([CX + x * v, CY + y * v], 1)
    elif kind == 'aniso':                 # y stretched by v (fraction), x nominal
        p[:, 1] = CY + y * (1 + v)
    elif kind == 'bow':                   # cylindrical bow along the long side, sag v mm at center
        R = (L / 2) ** 2 / (2 * v) + v / 2
        th = x / R
        p[:, 0] = CX + R * np.sin(th)
        p[:, 2] = -(v - R * (1 - np.cos(th)))   # center raised by v toward camera
    elif kind == 'dome':                  # spherical, sag v mm at center over the half-diagonal
        r2 = x ** 2 + y ** 2
        rmax2 = (L / 2) ** 2 + (S / 2) ** 2
        p[:, 2] = -v * (1 - r2 / rmax2)
    elif kind == 'combo':                 # bow 2 mm + y stretched 0.3 %
        p = deform('bow', 2.0)
        p[:, 1] = CY + (p[:, 1] - CY) * 1.003
    elif kind == 'wave':                  # paper cockle: amplitude v mm, 60 mm wavelength
        p[:, 2] = v * np.sin(2 * np.pi * x / 60) * np.sin(2 * np.pi * y / 60)
    return p


def poses(rng):
    out = []
    while len(out) < N_VIEWS:
        z = rng.uniform(550, 950)
        rx, ry = np.deg2rad(rng.uniform(-40, 40, 2))
        rz = np.deg2rad(rng.uniform(-20, 20))
        R = cv2.Rodrigues(np.array([rx, ry, rz]))[0]
        fovx, fovy = W / K_TRUE[0, 0] * z, H / K_TRUE[1, 1] * z
        t = np.array([rng.uniform(-0.3, 0.3) * fovx, rng.uniform(-0.3, 0.3) * fovy, z]) - R @ np.array([CX, CY, 0])
        rv = cv2.Rodrigues(R)[0]
        img, _ = cv2.projectPoints(NOMINAL, rv, t, K_TRUE, D_TRUE)
        img = img.reshape(-1, 2)
        if (img[:, 0].min() > 20 and img[:, 0].max() < W - 20 and img[:, 1].min() > 20 and img[:, 1].max() < H - 20):
            out.append((rv, t))
    return out


CORNERS_PX = np.array([[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]], np.float64)


def edge_error(K, d):
    rays = cv2.undistortPoints(CORNERS_PX.reshape(-1, 1, 2), K_TRUE, D_TRUE).reshape(-1, 2)
    pts3 = np.hstack([rays, np.ones((4, 1))])
    proj, _ = cv2.projectPoints(pts3, np.zeros(3), np.zeros(3), K, d)
    return np.linalg.norm(proj.reshape(-1, 2) - CORNERS_PX, axis=1).max()


def run(kind, v, seed=0):
    true_board = deform(kind, v) if kind else NOMINAL
    res = []
    for trial in range(N_TRIALS):
        rng = np.random.default_rng(seed * 1000 + trial)
        P = poses(rng)
        obj, img = [], []
        for rv, t in P:
            pr, _ = cv2.projectPoints(true_board, rv, t, K_TRUE, D_TRUE)
            pr = pr.reshape(-1, 2) + rng.normal(0, NOISE, (len(true_board), 2))
            obj.append(NOMINAL.astype(np.float32)); img.append(pr.astype(np.float32))
        rms, K, d, rvecs, tvecs = cv2.calibrateCamera(obj, img, (W, H), None, None)
        c = np.array([CX, CY, 0.0])
        dz = np.mean([np.linalg.norm(cv2.Rodrigues(rf)[0] @ c + tf.ravel()) / np.linalg.norm(cv2.Rodrigues(r0)[0] @ c + t0) - 1
                      for rf, tf, (r0, t0) in zip(rvecs, tvecs, P)])
        res.append([rms, (K[0, 0] / K_TRUE[0, 0] - 1) * 100, ((K[1, 1] / K[0, 0]) - 1) * 100, edge_error(K, d), dz * 100])
    return np.median(np.array(res), 0)


SCENARIOS = [
    ('Flat, exact board (reference)', None, 0),
    ('Uniform scale 96 % (fit to page)', 'scale', 0.96),
    ('One direction +0.1 %', 'aniso', 0.001),
    ('One direction +0.3 %', 'aniso', 0.003),
    ('One direction +0.5 %', 'aniso', 0.005),
    ('Cylindrical bow 0.5 mm', 'bow', 0.5),
    ('Cylindrical bow 1 mm', 'bow', 1.0),
    ('Cylindrical bow 2 mm', 'bow', 2.0),
    ('Cylindrical bow 4 mm', 'bow', 4.0),
    ('Dome 1 mm', 'dome', 1.0),
    ('Dome 2 mm', 'dome', 2.0),
    ('Cockle ±0.2 mm', 'wave', 0.2),
    ('Cockle ±0.5 mm', 'wave', 0.5),
    ('Bow 2 mm + one direction +0.3 %', 'combo', 1),
]

def set_camera(w, h):
    """Same lens field of view, different sensor resolution."""
    global W, H, K_TRUE, CORNERS_PX
    f = 3478.0 * w / 2448
    W, H = w, h
    K_TRUE = np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1]])
    CORNERS_PX = np.array([[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]], np.float64)


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'lowres':
        set_camera(1280, 1071)
        SCENARIOS = [s for s in SCENARIOS if s[1] in (None, 'bow', 'wave', 'aniso')]
    print('OpenCV', cv2.__version__, 'camera', W, 'x', H)
    print(f"{'scenario':38s} {'RMS px':>7s} {'fx %':>7s} {'fy/fx %':>8s} {'edge px':>8s} {'dist %':>7s}")
    for name, kind, v in SCENARIOS:
        r = run(kind, v)
        print(f"{name:38s} {r[0]:7.3f} {r[1]:7.2f} {r[2]:8.3f} {r[3]:8.2f} {r[4]:7.2f}")
