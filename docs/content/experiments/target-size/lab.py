"""One ChArUco board rendered through a known camera, at a chosen share of the image width. OpenCV + numpy + scipy only."""
import numpy as np, cv2
from scipy.optimize import least_squares
W, H = 1920, 1440
K = np.array([[2250., 0, 960], [0, 2250., 720], [0, 0, 1]])
DIST = np.array([-0.12, 0, 0, 0, 0.])
ARUCO = cv2.aruco
DICT = ARUCO.getPredefinedDictionary(ARUCO.DICT_6X6_250)
BOARD_MM = (280.0, 180.0)
_u, _v = np.meshgrid(np.arange(W, dtype=np.float64), np.arange(H, dtype=np.float64))
_n = cv2.undistortPoints(np.stack([_u.ravel(), _v.ravel()], 1).reshape(-1, 1, 2), K, DIST).reshape(-1, 2)
RAYS = np.hstack([_n, np.ones((len(_n), 1))]).astype(np.float32)            # direction of each pixel

class Board:
    """cols x rows squares on the same 280 x 180 mm area: 14 x 9 with 20 mm squares, or 28 x 18 with 10 mm squares."""
    def __init__(self, cols=14, rows=9):
        self.cols, self.rows = cols, rows
        self.sq = BOARD_MM[0] / cols; self.mk = self.sq * 0.75
        # 28 x 18 has 252 markers, two more than DICT_6X6_250 holds, so it takes the 1000-marker dictionary
        d = DICT if cols * rows // 2 <= 250 else ARUCO.getPredefinedDictionary(ARUCO.DICT_6X6_1000)
        self.cv = ARUCO.CharucoBoard((cols, rows), self.sq, self.mk, d)
        self.corners = self.cv.getChessboardCorners().astype(np.float64)
        self.outline = np.array([[0, 0, 0], [BOARD_MM[0], 0, 0], [BOARD_MM[0], BOARD_MM[1], 0], [0, BOARD_MM[1], 0]], np.float64)
        self.px_per_mm, self.margin = 8.0, 40
        img = self.cv.generateImage((int(BOARD_MM[0] * 8) + 80, int(BOARD_MM[1] * 8) + 80), marginSize=40)
        self.tex = cv2.GaussianBlur(img.astype(np.float32), (0, 0), 1.5)
        self.detector = ARUCO.CharucoDetector(self.cv)

def distance_for(fill):
    """Distance at which the board's 280 mm, square-on at the image centre, spans `fill` of the image width."""
    return K[0, 0] * BOARD_MM[0] / (fill * W)

def render(board, rvec, tvec, rng, blur=0.8, noise=2.0, background=120):
    """Every pixel is traced through the true lens onto the board plane, then the texture is sampled there."""
    R, _ = cv2.Rodrigues(np.asarray(rvec, float)); t = np.asarray(tvec, float).reshape(3); n = R[:, 2]
    with np.errstate(divide="ignore", invalid="ignore"):
        s = (t @ n) / (RAYS @ n)
    p = (RAYS * s[:, None] - t) @ R
    m = board.margin
    mx = (p[:, 0] * board.px_per_mm + m - 0.5).astype(np.float32).reshape(H, W); my = (p[:, 1] * board.px_per_mm + m - 0.5).astype(np.float32).reshape(H, W)
    # far away the texture is much finer than the image: average it down first, as a sensor pixel would
    scale = board.px_per_mm * float(np.median(s[np.isfinite(s)])) / K[0, 0]
    tex = board.tex if scale < 1.5 else cv2.GaussianBlur(board.tex, (0, 0), 0.5 * scale)
    out = cv2.remap(tex, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=float(background))
    out[(s <= 0).reshape(H, W)] = background
    img = cv2.GaussianBlur(out, (0, 0), blur) + rng.normal(0, noise, (H, W)).astype(np.float32)
    return np.clip(img, 0, 255).astype(np.uint8)

def project(pts, rvec, tvec):
    return cv2.projectPoints(pts, np.asarray(rvec, float), np.asarray(tvec, float), K, DIST)[0].reshape(-1, 2)

def inside(p, margin=8):
    return (p[:, 0] > margin) & (p[:, 0] < W - margin) & (p[:, 1] > margin) & (p[:, 1] < H - margin)

def pose(board, fill, rng, place="spread", tilt=(5, 35)):
    """A view with the board at about `fill` of the image width.
    place: 'spread' = anywhere, whole board in the image; 'centre' = board centre within 6 % of the image centre;
    'overhang' = anywhere, at least half of the inner corners in the image."""
    for _ in range(100000):
        z = distance_for(fill) * rng.uniform(0.92, 1.08)
        span = 0.06 if place == "centre" else 0.5
        u = W / 2 + rng.uniform(-span, span) * W; v = H / 2 + rng.uniform(-span, span) * H
        ray = cv2.undistortPoints(np.array([[[u, v]]], np.float64), K, DIST).reshape(2)
        centre = np.array([ray[0] * z, ray[1] * z, z])
        ax = rng.normal(size=2); ax = np.r_[ax / np.linalg.norm(ax), 0]
        Rt, _ = cv2.Rodrigues(ax * np.deg2rad(rng.uniform(*tilt))); Rs, _ = cv2.Rodrigues(np.array([0, 0, np.deg2rad(rng.uniform(-15, 15))]))
        R = Rt @ Rs; t = centre - R @ np.array([BOARD_MM[0] / 2, BOARD_MM[1] / 2, 0])
        r = cv2.Rodrigues(R)[0].ravel()
        if place == "overhang":
            if inside(project(board.corners, r, t)).mean() >= 0.5: return r, t
        elif inside(project(board.outline, r, t)).all(): return r, t
    raise RuntimeError("no pose found")

def detect(board, img):
    cc, ci, _, _ = board.detector.detectBoard(img)
    if ci is None or len(ci) < 6 or board.cv.checkCharucoCornersCollinear(ci): return None, None
    return cc.reshape(-1, 2), ci.ravel()

def model_error(K2, d2, step=60):
    """Mean and worst pixel difference between the true camera and a solved one, after the best rotation between them is removed."""
    xs = np.arange(step / 2, W, step); ys = np.arange(step / 2, H, step)
    px = np.array([(x, y) for y in ys for x in xs], np.float64)
    n = cv2.undistortPoints(px.reshape(-1, 1, 2), K, DIST).reshape(-1, 2); rays = np.hstack([n, np.ones((len(n), 1))])
    def resid(w):
        return (cv2.projectPoints(rays, w, np.zeros(3), K2, d2)[0].reshape(-1, 2) - px).ravel()
    sol = least_squares(resid, np.zeros(3), method="lm")
    e = np.linalg.norm(resid(sol.x).reshape(-1, 2), axis=1)
    return float(e.mean()), float(e.max())
