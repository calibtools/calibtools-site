"""Shared parts of the substrate test: the camera, the boards as sold, how a board is deformed, the views,
and how a fitted camera model is compared with the true one.

Points only, no rendered images: the true (deformed) board is projected with the true camera, 0.05 px of
Gaussian noise is added, and the calibration is told the board is the nominal flat grid.
numpy, scipy and opencv-python only.
"""
import numpy as np
import cv2
from scipy.optimize import least_squares

W, H = 2448, 2048                                    # 5 MP sensor, 3.45 um pixels
K_TRUE = np.array([[3478.0, 0, 1224.0], [0, 3478.0, 1024.0], [0, 0, 1]])   # 12 mm lens, 38.8 degrees across
D_TRUE = np.array([-0.12, 0.08, 0.0004, -0.0003, 0.0])
NOISE = 0.05                                         # px, per coordinate
VIEWS = 20

# ChArUco boards from the shop: plate long x short side, squares across x down, square side. All in mm.
BOARDS = {
    "composite-200": dict(material="composite", plate=(200, 150), squares=(7, 5), square=25.0),
    "composite-300": dict(material="composite", plate=(300, 200), squares=(10, 7), square=25.0),
    "composite-800": dict(material="composite", plate=(800, 600), squares=(15, 11), square=50.0),
    "ceramic-230": dict(material="ceramic", plate=(230, 140), squares=(14, 8), square=15.0),
}

# Published limits. Composite: any corner within 0.3 mm + 0.2 mm per meter of the nominal grid, flat to
# 0.5 mm per meter. Ceramic: 2 um (a target, not yet measured on production boards), flat to 20 um.
def position_limit(name):
    b = BOARDS[name]
    return 0.3 + 0.2 * b["plate"][0] / 1000 if b["material"] == "composite" else 0.002

def flatness_limit(name):
    b = BOARDS[name]
    return 0.5 * b["plate"][0] / 1000 if b["material"] == "composite" else 0.020

EXPANSION = {"composite": 24e-6, "ceramic": 7.2e-6}   # per degree C
THICKNESS = {"composite": 6.0, "ceramic": 3.0}        # mm


def nominal(name):
    """Inner corners of the board, row by row, z = 0, origin at the first corner."""
    b = BOARDS[name]
    nx, ny = b["squares"][0] - 1, b["squares"][1] - 1
    gx, gy = np.meshgrid(np.arange(nx) * b["square"], np.arange(ny) * b["square"])
    return np.stack([gx.ravel(), gy.ravel(), np.zeros(gx.size)], 1)


def deform(name, kind, amount, rng=None):
    """The board as it really is. `amount` is in mm: the largest distance any corner moves in the plane
    (scale, stretch, skew, curve, random) or the height of the shape (bow, dome, twist)."""
    p = nominal(name)
    if kind is None or amount == 0: return p
    c = p.mean(0); x, y = p[:, 0] - c[0], p[:, 1] - c[1]
    hx, hy = np.abs(x).max(), np.abs(y).max(); r = np.hypot(hx, hy)
    if kind == "scale":            # the whole pattern larger by the same factor
        k = amount / r; p[:, 0] += x * k; p[:, 1] += y * k
    elif kind == "stretch":        # longer in the long direction only
        p[:, 0] += x * amount / hx
    elif kind == "skew":           # rows not square to columns
        p[:, 0] += y * amount / hy
    elif kind == "curve":          # spacing grows toward one end: x' = x + a * (x / hx)^2, kept centered
        q = (x / hx) ** 2; p[:, 0] += amount * (q - q.mean()) / np.abs(q - q.mean()).max()
    elif kind == "random":         # every corner somewhere within `amount` of its place, independently
        ang = rng.uniform(0, 2 * np.pi, len(p)); rad = amount * np.sqrt(rng.uniform(0, 1, len(p)))
        p[:, 0] += rad * np.cos(ang); p[:, 1] += rad * np.sin(ang)
    elif kind == "bow":            # cylinder along the long side; `amount` over the plate length
        L = BOARDS[name]["plate"][0]; p[:, 2] = -amount * (1 - (2 * x / L) ** 2)
    elif kind == "dome":           # bowl; `amount` over the plate diagonal
        L, S = BOARDS[name]["plate"]; p[:, 2] = -amount * (1 - (x * x + y * y) / ((L / 2) ** 2 + (S / 2) ** 2))
    elif kind == "twist":          # two opposite plate corners up, two down; `amount` peak to valley
        L, S = BOARDS[name]["plate"]; p[:, 2] = amount / 2 * (2 * x / L) * (2 * y / S)
    elif kind == "warm":           # the whole board `amount` degrees C warmer than the calibration is told
        k = EXPANSION[BOARDS[name]["material"]] * amount; p[:, 0] += x * k; p[:, 1] += y * k
    elif kind == "gradient":       # one face `amount` degrees C warmer than the other: see thermal_bow
        return deform(name, "bow", thermal_bow(name, amount))
    else:
        raise ValueError(kind)
    return p


def thermal_bow(name, degrees):
    """Height in mm of the bow over the plate length when one face is `degrees` C warmer than the other and
    the plate is free to bend: curvature = expansion * degrees / thickness, height = curvature * length^2 / 8."""
    m = BOARDS[name]["material"]; L = BOARDS[name]["plate"][0]
    return EXPANSION[m] * degrees / THICKNESS[m] * L * L / 8


def views(name, rng, count=VIEWS, fill=(0.45, 0.8), tilt=35.0):
    """Poses with the whole board in the image, the board's long side covering 45 to 80 % of the image width."""
    P = nominal(name); c = P.mean(0); span = P[:, 0].max() - P[:, 0].min() + 2 * BOARDS[name]["square"]
    out = []
    while len(out) < count:
        z = span * K_TRUE[0, 0] / (rng.uniform(*fill) * W)
        rx, ry = np.deg2rad(rng.uniform(-tilt, tilt, 2)); rz = np.deg2rad(rng.uniform(-20, 20))
        R = cv2.Rodrigues(np.array([rx, ry, rz]))[0]
        t = np.array([rng.uniform(-0.35, 0.35) * W / K_TRUE[0, 0] * z, rng.uniform(-0.35, 0.35) * H / K_TRUE[1, 1] * z, z]) - R @ c
        rv = cv2.Rodrigues(R)[0].ravel()
        px = cv2.projectPoints(P, rv, t, K_TRUE, D_TRUE)[0].reshape(-1, 2)
        if px[:, 0].min() > 20 and px[:, 0].max() < W - 20 and px[:, 1].min() > 20 and px[:, 1].max() < H - 20:
            out.append((rv, t))
    return out


def model_error(K, d, step=68):
    """Mean and largest distance in px between the true camera and a fitted one over the whole image, after
    the best rotation between them is taken out (a calibration cannot tell a small rotation of the camera
    from a shift of the image center, and neither can anything that uses it)."""
    xs = np.arange(step / 2, W, step); ys = np.arange(step / 2, H, step)
    px = np.array([(x, y) for y in ys for x in xs], np.float64)
    rays = cv2.undistortPoints(px.reshape(-1, 1, 2), K_TRUE, D_TRUE).reshape(-1, 2)
    rays = np.hstack([rays, np.ones((len(rays), 1))])
    resid = lambda w: (cv2.projectPoints(rays, w, np.zeros(3), K, d)[0].reshape(-1, 2) - px).ravel()
    e = np.linalg.norm(resid(least_squares(resid, np.zeros(3), method="lm").x).reshape(-1, 2), axis=1)
    return float(e.mean()), float(e.max())


def session(name, kind, amount, seed, release=False, count=VIEWS):
    """One calibration of `count` views. `release`: cv2.calibrateCameraRO, which also solves for where the
    corners are on the board, with the first, the top-right and the last corner held at their nominal places."""
    rng = np.random.default_rng(seed)
    true_board = deform(name, kind, amount, rng)
    told = nominal(name).astype(np.float32)
    P = views(name, rng, count); obj, img = [], []
    for rv, t in P:
        px = cv2.projectPoints(true_board, rv, t, K_TRUE, D_TRUE)[0].reshape(-1, 2)
        img.append((px + rng.normal(0, NOISE, px.shape)).astype(np.float32)); obj.append(told)
    if release:
        nx = BOARDS[name]["squares"][0] - 1
        rms, K, d, rvecs, tvecs = cv2.calibrateCameraRO(obj, img, (W, H), nx - 1, None, None)[:5]
    else:
        rms, K, d, rvecs, tvecs = cv2.calibrateCamera(obj, img, (W, H), None, None)
    c = nominal(name).mean(0)
    dist = np.mean([np.linalg.norm(cv2.Rodrigues(r)[0] @ c + tv.ravel()) / np.linalg.norm(cv2.Rodrigues(r0)[0] @ c + t0) - 1
                    for r, tv, (r0, t0) in zip(rvecs, tvecs, P)])
    mean, worst = model_error(K, d)
    return dict(rms=float(rms), fx_pct=float((K[0, 0] / K_TRUE[0, 0] - 1) * 100), aspect_pct=float((K[1, 1] / K[0, 0] - 1) * 100),
                model_mean=mean, model_max=worst, distance_pct=float(dist * 100))
