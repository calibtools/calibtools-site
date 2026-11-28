"""A ChArUco board rendered through a known camera, for the reprojection-error guide. OpenCV + numpy + scipy only.
Board: 10 x 7 squares of 25 mm, 18 mm markers. Camera: 1920 x 1440 px, focal length 2250 px, two radial terms."""
import numpy as np, cv2
from scipy.optimize import least_squares
W, H = 1920, 1440
K = np.array([[2250., 0, 960], [0, 2250., 720], [0, 0, 1]])
DIST = np.array([-0.20, 0.08, 0, 0, 0.])
ARUCO = cv2.aruco
COLS, ROWS, SQ, MK = 10, 7, 25.0, 18.0                       # mm
BOARD_MM = (COLS * SQ, ROWS * SQ)
_u, _v = np.meshgrid(np.arange(W, dtype=np.float64), np.arange(H, dtype=np.float64))
_n = cv2.undistortPoints(np.stack([_u.ravel(), _v.ravel()], 1).reshape(-1, 1, 2), K, DIST).reshape(-1, 2)
RAYS = np.hstack([_n, np.ones((len(_n), 1))]).astype(np.float32)            # direction of each pixel
PX_PER_MM, MARGIN = 8.0, 40

class Board:
    def __init__(self, kind="charuco"):
        self.kind = kind
        self.cv = ARUCO.CharucoBoard((COLS, ROWS), SQ, MK, ARUCO.getPredefinedDictionary(ARUCO.DICT_6X6_250))
        self.corners = self.cv.getChessboardCorners().astype(np.float64)      # the 9 x 6 inner corners, row by row
        self.outline = np.array([[0, 0, 0], [BOARD_MM[0], 0, 0], [BOARD_MM[0], BOARD_MM[1], 0], [0, BOARD_MM[1], 0]], np.float64)
        size = (int(BOARD_MM[0] * PX_PER_MM) + 2 * MARGIN, int(BOARD_MM[1] * PX_PER_MM) + 2 * MARGIN)
        if kind == "charuco":
            img = self.cv.generateImage(size, marginSize=MARGIN)
        else:
            img = np.full(size[::-1], 255, np.uint8); s = int(SQ * PX_PER_MM)
            for r in range(ROWS):
                for c in range(COLS):
                    if (r + c) % 2 == 0: img[MARGIN + r * s:MARGIN + (r + 1) * s, MARGIN + c * s:MARGIN + (c + 1) * s] = 0
        self.tex = cv2.GaussianBlur(img.astype(np.float32), (0, 0), 1.5)
        self.detector = ARUCO.CharucoDetector(self.cv)

def distance_for(fill):
    """Distance at which the board's long side, square-on at the image centre, spans `fill` of the image width."""
    return K[0, 0] * BOARD_MM[0] / (fill * W)

def bow_height(x, y, bow):
    """Height of a board bowed like a shallow dish: 0 at the centre, `bow` mm at the corners."""
    hx, hy = BOARD_MM[0] / 2, BOARD_MM[1] / 2
    return bow * ((x - hx) ** 2 + (y - hy) ** 2) / (hx ** 2 + hy ** 2)

def render(board, rvec, tvec, rng, blur=0.8, noise=2.0, background=120, bow=0.0, shear=0.0):
    """Every pixel is traced through the true lens onto the board, then the texture is sampled there.
    bow: the board is a shallow dish, mm at the corners. shear: rows shifted sideways by up to +-shear px,
    top to bottom, as a rolling shutter does when the board moves during the frame."""
    R, _ = cv2.Rodrigues(np.asarray(rvec, float)); t = np.asarray(tvec, float).reshape(3); n = R[:, 2]
    with np.errstate(divide="ignore", invalid="ignore"):
        s = (t @ n) / (RAYS @ n)
        p = (RAYS * s[:, None] - t) @ R
        if bow:
            d = RAYS @ R; o = -t @ R                         # rays and camera centre in the board frame
            for _ in range(3):
                s = (bow_height(p[:, 0], p[:, 1], bow) - o[2]) / d[:, 2]
                p = o + d * s[:, None]
    mx = (p[:, 0] * PX_PER_MM + MARGIN - 0.5).astype(np.float32).reshape(H, W); my = (p[:, 1] * PX_PER_MM + MARGIN - 0.5).astype(np.float32).reshape(H, W)
    scale = PX_PER_MM * float(np.median(s[np.isfinite(s)])) / K[0, 0]
    tex = board.tex if scale < 1.5 else cv2.GaussianBlur(board.tex, (0, 0), 0.5 * scale)
    out = cv2.remap(tex, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=float(background))
    out[(s <= 0).reshape(H, W)] = background
    if shear:
        A = np.array([[1, 2 * shear / H, -shear], [0, 1, 0]], np.float32)
        out = cv2.warpAffine(out, A, (W, H), flags=cv2.INTER_LINEAR, borderValue=float(background))
    img = cv2.GaussianBlur(out, (0, 0), blur) + rng.normal(0, noise, (H, W)).astype(np.float32)
    return np.clip(img, 0, 255).astype(np.uint8)

def project(pts, rvec, tvec):
    return cv2.projectPoints(pts, np.asarray(rvec, float), np.asarray(tvec, float), K, DIST)[0].reshape(-1, 2)

def inside(p, margin=8):
    return (p[:, 0] > margin) & (p[:, 0] < W - margin) & (p[:, 1] > margin) & (p[:, 1] < H - margin)

def pose(board, rng, fill=0.5, tilt=(5, 35), distance=(0.92, 1.08), place="spread"):
    """A view with the whole board in the image, at about `fill` of the image width.
    tilt: range of the angle between the board and the sensor plane, degrees. distance: range, as a factor.
    place: 'spread' = anywhere in the image, 'centre' = board centre within 6 % of the image centre."""
    for _ in range(100000):
        z = distance_for(fill) * rng.uniform(*distance)
        span = 0.06 if place == "centre" else 0.5
        u = W / 2 + rng.uniform(-span, span) * W; v = H / 2 + rng.uniform(-span, span) * H
        ray = cv2.undistortPoints(np.array([[[u, v]]], np.float64), K, DIST).reshape(2)
        centre = np.array([ray[0] * z, ray[1] * z, z])
        ax = rng.normal(size=2); ax = np.r_[ax / np.linalg.norm(ax), 0]
        Rt, _ = cv2.Rodrigues(ax * np.deg2rad(rng.uniform(*tilt))); Rs, _ = cv2.Rodrigues(np.array([0, 0, np.deg2rad(rng.uniform(-15, 15))]))
        R = Rt @ Rs; t = centre - R @ np.array([BOARD_MM[0] / 2, BOARD_MM[1] / 2, 0])
        r = cv2.Rodrigues(R)[0].ravel()
        if inside(project(board.outline, r, t)).all(): return r, t
    raise RuntimeError("no pose found")

def detect_charuco(board, img):
    cc, ci, _, _ = board.detector.detectBoard(img)
    if ci is None or len(ci) < 8: return None, None
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

def per_view_errors(obj, img, K2, d2, rvecs, tvecs):
    """RMS reprojection error of each view."""
    out = []
    for o, p, r, t in zip(obj, img, rvecs, tvecs):
        e = cv2.projectPoints(o, r, t, K2, d2)[0].reshape(-1, 2) - p.reshape(-1, 2)
        out.append(float(np.sqrt((e ** 2).sum(axis=1).mean())))
    return out

def held_out_rms(obj, img, K2, d2):
    """Views that were not used in the calibration: pose from solvePnP with the solved camera, then the RMS over all their corners."""
    sq = []
    for o, p in zip(obj, img):
        ok, r, t = cv2.solvePnP(o, p, K2, d2)
        e = cv2.projectPoints(o, r, t, K2, d2)[0].reshape(-1, 2) - p.reshape(-1, 2)
        sq.append((e ** 2).sum(axis=1))
    return float(np.sqrt(np.concatenate(sq).mean()))

def radius_bins(obj, img, K2, d2, rvecs, tvecs, bins=4):
    """Mean reprojection error of the corners in `bins` rings of equal width around the principal point, out to the image corner."""
    r_all, e_all = [], []
    for o, p, r, t in zip(obj, img, rvecs, tvecs):
        e = np.linalg.norm(cv2.projectPoints(o, r, t, K2, d2)[0].reshape(-1, 2) - p.reshape(-1, 2), axis=1)
        r_all.append(np.hypot(p.reshape(-1, 2)[:, 0] - K2[0, 2], p.reshape(-1, 2)[:, 1] - K2[1, 2])); e_all.append(e)
    r_all, e_all = np.concatenate(r_all), np.concatenate(e_all)
    edges = np.linspace(0, np.hypot(W / 2, H / 2), bins + 1)
    return [dict(corners=int(((r_all >= a) & (r_all < b)).sum()), mean=float(e_all[(r_all >= a) & (r_all < b)].mean()) if ((r_all >= a) & (r_all < b)).any() else None) for a, b in zip(edges[:-1], edges[1:])]

def straight_line_check(K2, d2):
    """What a photo of a straight edge would show. Two edges that are straight in the world, one along the top of the
    image and one from corner to corner, are imaged by the true camera, undistorted with the solved one, and a line is
    fitted to each. Returns the largest distance of a point from its line, in pixels, for (top edge, diagonal)."""
    out = []
    xn, yn = (W / 2 - 40) / K[0, 0], (H / 2 - 40) / K[1, 1]              # 40 px inside the frame, before distortion
    und = cv2.undistortPoints(np.array([[[40.0, 40.0]], [[W - 40.0, 40.0]], [[W - 40.0, H - 40.0]]]), K, DIST).reshape(-1, 2)
    for a, b in ((und[0], und[1]), (und[0], und[2])):
        line = a + np.linspace(0, 1, 200)[:, None] * (b - a)             # straight in the world
        px = cv2.projectPoints(np.hstack([line, np.ones((200, 1))]), np.zeros(3), np.zeros(3), K, DIST)[0]
        flat = cv2.undistortPoints(px, K2, d2, P=K2).reshape(-1, 2)      # the user's undistorted image
        c = flat - flat.mean(axis=0); normal = np.linalg.svd(c, full_matrices=False)[2][1]
        out.append(float(np.abs(c @ normal).max()))
    return out
