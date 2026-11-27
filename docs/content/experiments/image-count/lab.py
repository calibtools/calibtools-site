"""One ChArUco board rendered through a known camera. OpenCV + numpy + scipy only."""
import numpy as np, cv2
W, H = 1280, 960
K = np.array([[1500., 0, 640], [0, 1500., 480], [0, 0, 1]])
DIST = np.array([-0.12, 0, 0, 0, 0.])
ARUCO = cv2.aruco
DICT = ARUCO.getPredefinedDictionary(ARUCO.DICT_6X6_250)
SQ, MK, COLS, ROWS = 30.0, 22.0, 10, 7          # mm, 300 x 210 mm board
PX_PER_MM = 8.0
BOARD = ARUCO.CharucoBoard((COLS, ROWS), SQ, MK, DICT)
_u, _v = np.meshgrid(np.arange(W, dtype=np.float64), np.arange(H, dtype=np.float64))
_pts = np.stack([_u.ravel(), _v.ravel()], 1).reshape(-1, 1, 2)
_n = cv2.undistortPoints(_pts, K, DIST).reshape(-1, 2)
RAYS = np.hstack([_n, np.ones((len(_n), 1))])            # direction of each pixel

_tex = None
def texture():
    global _tex
    if _tex is None:
        m = 40  # white margin in px
        img = BOARD.generateImage((int(COLS * SQ * PX_PER_MM) + 2 * m, int(ROWS * SQ * PX_PER_MM) + 2 * m), marginSize=m)
        _tex = (cv2.GaussianBlur(img.astype(np.float32), (0, 0), 1.5), m)
    return _tex

def render(rvec, tvec, rng, blur=0.8, noise=2.0, background=120):
    """Every pixel is traced through the true lens onto the board plane, then the texture is sampled there."""
    out = np.full(H * W, background, np.float32)
    tex, m = texture()
    R, _ = cv2.Rodrigues(np.asarray(rvec, float)); t = np.asarray(tvec, float).reshape(3); n = R[:, 2]
    with np.errstate(divide="ignore", invalid="ignore"):
        s = (t @ n) / (RAYS @ n)
    p = (RAYS * s[:, None] - t) @ R
    mx = (p[:, 0] * PX_PER_MM + m - 0.5).astype(np.float32); my = (p[:, 1] * PX_PER_MM + m - 0.5).astype(np.float32)
    inside = np.isfinite(s) & (s > 0) & (mx >= 0) & (my >= 0) & (mx < tex.shape[1] - 1) & (my < tex.shape[0] - 1)
    val = cv2.remap(tex, mx.reshape(H, W), my.reshape(H, W), cv2.INTER_LINEAR).ravel()
    out[inside] = val[inside]
    img = cv2.GaussianBlur(out.reshape(H, W), (0, 0), blur) + rng.normal(0, noise, (H, W))
    return np.clip(img, 0, 255).astype(np.uint8)

def truth(rvec, tvec):
    """Image positions of every inner corner of the board, in OpenCV's corner order."""
    obj = BOARD.getChessboardCorners().astype(np.float64)
    return cv2.projectPoints(obj, np.asarray(rvec, float), np.asarray(tvec, float), K, DIST)[0].reshape(-1, 2)

def look_at(centre, tilt_deg, rng, spin_deg=0.0):
    """Pose of a board whose centre is at `centre` (camera frame, mm), tilted about a random axis."""
    ax = rng.normal(size=2); ax = np.r_[ax / np.linalg.norm(ax), 0]
    Rt, _ = cv2.Rodrigues(ax * np.deg2rad(tilt_deg)); Rs, _ = cv2.Rodrigues(np.array([0, 0, np.deg2rad(spin_deg)]))
    R = Rt @ Rs; c_board = np.array([COLS * SQ / 2, ROWS * SQ / 2, 0])
    t = np.asarray(centre, float) - R @ c_board
    return cv2.Rodrigues(R)[0].ravel(), t

def in_frame(p):
    return bool(np.all((p[:, 0] > 8) & (p[:, 0] < W - 8) & (p[:, 1] > 8) & (p[:, 1] < H - 8)))

def good_pose(rng):
    """Whole board in the image, long side 28 to 50 % of the image width square-on, tilted 10 to 40 degrees, anywhere in the frame."""
    while True:
        z = rng.uniform(700, 1250)                       # 300 mm at 1500 px: 28 to 50 % of the image width square-on
        cx = rng.uniform(-0.35, 0.35) * W * z / K[0, 0]; cy = rng.uniform(-0.35, 0.35) * H * z / K[1, 1]
        r, t = look_at((cx, cy, z), rng.uniform(10, 40), rng, rng.uniform(-15, 15))
        if in_frame(truth(r, t)): return r, t

def lazy_pose(rng):
    """The board held near the middle of the image, nearly square to the camera."""
    while True:
        z = rng.uniform(800, 1000)
        cx = rng.uniform(-0.08, 0.08) * W * z / K[0, 0]; cy = rng.uniform(-0.08, 0.08) * H * z / K[1, 1]
        r, t = look_at((cx, cy, z), rng.uniform(0, 8), rng, rng.uniform(-5, 5))
        if in_frame(truth(r, t)): return r, t

def detect(img):
    cc, ci, _, _ = ARUCO.CharucoDetector(BOARD).detectBoard(img)
    if ci is None or len(ci) < 6: return None, None
    return cc.reshape(-1, 2), ci.ravel()

from scipy.optimize import least_squares
def model_error(K2, d2, step=40):
    """Mean and worst pixel difference between the true camera and a solved one, after the best rotation between them is removed."""
    xs = np.arange(step / 2, W, step); ys = np.arange(step / 2, H, step)
    px = np.array([(x, y) for y in ys for x in xs], np.float64)
    n = cv2.undistortPoints(px.reshape(-1, 1, 2), K, DIST).reshape(-1, 2); rays = np.hstack([n, np.ones((len(n), 1))])
    def resid(w):
        return (cv2.projectPoints(rays, w, np.zeros(3), K2, d2)[0].reshape(-1, 2) - px).ravel()
    sol = least_squares(resid, np.zeros(3), method="lm")
    e = np.linalg.norm(resid(sol.x).reshape(-1, 2), axis=1)
    return float(e.mean()), float(e.max())
