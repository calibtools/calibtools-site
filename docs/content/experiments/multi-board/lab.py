"""Two ChArUco boards in one rendered image, known camera. OpenCV + numpy only."""
import numpy as np, cv2
W, H = 1280, 960
K = np.array([[1500., 0, 640], [0, 1500., 480], [0, 0, 1]])
DIST = np.array([-0.12, 0, 0, 0, 0.])
ARUCO = cv2.aruco
DICT = ARUCO.getPredefinedDictionary(ARUCO.DICT_6X6_250)
SQ, MK, COLS, ROWS = 30.0, 22.0, 10, 7          # mm, 300 x 210 mm board
PX_PER_MM = 8.0
_u, _v = np.meshgrid(np.arange(W, dtype=np.float64), np.arange(H, dtype=np.float64))
_pts = np.stack([_u.ravel(), _v.ravel()], 1).reshape(-1, 1, 2)
_n = cv2.undistortPoints(_pts, K, DIST).reshape(-1, 2)
RAYS = np.hstack([_n, np.ones((len(_n), 1))])            # direction of each pixel

def board(first_id=0, dictionary=DICT):
    ids = np.arange(first_id, first_id + COLS * ROWS // 2, dtype=np.int32)
    return ARUCO.CharucoBoard((COLS, ROWS), SQ, MK, dictionary, ids)

_tex = {}
def texture(b):
    key = (b.getDictionary().bytesList.tobytes(), b.getIds().tobytes())
    if key not in _tex:
        m = 40  # white margin in px
        img = b.generateImage((int(COLS * SQ * PX_PER_MM) + 2 * m, int(ROWS * SQ * PX_PER_MM) + 2 * m), marginSize=m)
        _tex[key] = (cv2.GaussianBlur(img.astype(np.float32), (0, 0), 1.5), m)
    return _tex[key]

def render(scene, rng, blur=0.8, noise=2.0, background=120):
    """scene: list of (board, rvec, tvec); board frame in mm, origin at top-left inner square corner, z into board."""
    out = np.full(H * W, background, np.float32); depth = np.full(H * W, np.inf)
    for b, rvec, tvec in scene:
        tex, m = texture(b)
        R, _ = cv2.Rodrigues(np.asarray(rvec, float)); t = np.asarray(tvec, float).reshape(3); n = R[:, 2]
        with np.errstate(divide="ignore", invalid="ignore"):
            s = (t @ n) / (RAYS @ n)
        p = (RAYS * s[:, None] - t) @ R
        mx = (p[:, 0] * PX_PER_MM + m - 0.5).astype(np.float32); my = (p[:, 1] * PX_PER_MM + m - 0.5).astype(np.float32)
        inside = np.isfinite(s) & (s > 0) & (mx >= 0) & (my >= 0) & (mx < tex.shape[1] - 1) & (my < tex.shape[0] - 1) & (s < depth)
        val = cv2.remap(tex, mx.reshape(H, W), my.reshape(H, W), cv2.INTER_LINEAR).ravel()
        out[inside] = val[inside]; depth[inside] = s[inside]
    img = cv2.GaussianBlur(out.reshape(H, W), (0, 0), blur) + rng.normal(0, noise, (H, W))
    return np.clip(img, 0, 255).astype(np.uint8)

def truth(b, rvec, tvec):
    """Image positions of every inner corner of the board, in OpenCV's corner order."""
    obj = b.getChessboardCorners().astype(np.float64)
    return cv2.projectPoints(obj, np.asarray(rvec, float), np.asarray(tvec, float), K, DIST)[0].reshape(-1, 2)

def look_at(centre, distance, tilt_deg, rng, spin_deg=0.0):
    """Pose of a board whose centre is at `centre` (camera frame, mm), tilted about a random axis."""
    ax = rng.normal(size=2); ax = np.r_[ax / np.linalg.norm(ax), 0]
    Rt, _ = cv2.Rodrigues(ax * np.deg2rad(tilt_deg)); Rs, _ = cv2.Rodrigues(np.array([0, 0, np.deg2rad(spin_deg)]))
    R = Rt @ Rs; c_board = np.array([COLS * SQ / 2, ROWS * SQ / 2, 0])
    t = np.asarray(centre, float) - R @ c_board
    return cv2.Rodrigues(R)[0].ravel(), t

# ---- a rig of two boards side by side, and the camera moving around it ----
GAP = 60.0  # mm between the two boards
def rig_poses(rng, n):
    """n camera views of the rig. Returns [(rvec1, tvec1, rvec2, tvec2)]: board 2 sits GAP mm right of board 1, same plane."""
    out = []
    rig_w = 2 * COLS * SQ + GAP
    while len(out) < n:
        z = rng.uniform(750, 1050)
        cx, cy = rng.uniform(-150, 500), rng.uniform(-260, 260)
        r, t = look_at((cx, cy, z), z, rng.uniform(10, 40), rng, rng.uniform(-15, 15))
        # look_at centres one board; shift so the rig centre lands there
        R, _ = cv2.Rodrigues(r)
        t1 = t - R @ np.array([(rig_w - COLS * SQ) / 2, 0, 0])
        t2 = t1 + R @ np.array([COLS * SQ + GAP, 0, 0])
        p1, p2 = truth(board(0), r, t1), truth(board(0), r, t2)
        vis = lambda p: np.mean((p[:, 0] > 0) & (p[:, 0] < W) & (p[:, 1] > 0) & (p[:, 1] < H))
        if vis(p1) > 0.6 and vis(p2) > 0.1:       # board 1 mostly in view, board 2 at least partly
            out.append((r, t1, r.copy(), t2))
    return out

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
