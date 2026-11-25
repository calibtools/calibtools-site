"""Which calibration target? Rendered images, known camera, five patterns of the same size.

Uses Plumbline's renderer, detectors and solver (calibtools/plumbline). Run: python <script>.py <plumbline/src>
All of it is simulation. No real camera images.
"""
import sys
import numpy as np, cv2
sys.path.insert(0, sys.argv[1])
from scipy.optimize import least_squares
from plumbline.core import synth, lens
from plumbline.core.targets import Target, CHARUCO, CHECKERBOARD, CIRCLES, ASYMMETRIC_CIRCLES, APRILGRID
from plumbline.core.detect import detect
from plumbline.core.calibrate import calibrate

CAM = synth.default_camera()  # 1280 x 960, f = 1500 px (46 degrees across), k1 = -0.12

# Five boards of about 300 x 210 mm.
BOARDS = {
    "checkerboard": Target(CHECKERBOARD, 10, 7, 30.0),                        # 54 inner corners
    "charuco":      Target(CHARUCO, 10, 7, 30.0, 22.0, "DICT_5X5_250"),      # 54 inner corners, 35 markers
    "aprilgrid":    Target(APRILGRID, 6, 4, 40.0, 12.0, "DICT_APRILTAG_36h11"),  # 24 tags, 96 corners
    "circles":      Target(CIRCLES, 10, 7, 30.0, 16.8),                       # 70 centers
    # 9 rows, an odd number: with 10 rows findCirclesGrid numbered this grid from an end that does not match the
    # object points (40 to 77 px left after solvePnP on single views), and every session solved to nonsense.
    "asym_circles": Target(ASYMMETRIC_CIRCLES, 14, 9, 21.0, 14.0),           # 63 centers, OpenCV size (7, 9)
}

def outline(T, n=6):
    """Points along the edge of the printed pattern (mm, board frame): the outer squares, tags or circles included."""
    p = T.object_points()[:, :2]; lo = p.min(0); hi = p.max(0)
    pad = T.circle_diameter_mm / 2 if T.is_circles else (0.0 if T.kind == APRILGRID else T.square_mm)
    lo = lo - pad; hi = hi + pad; t = np.linspace(0, 1, n)
    xs = lo[0] + (hi[0] - lo[0]) * t; ys = lo[1] + (hi[1] - lo[1]) * t
    edge = [(x, lo[1]) for x in xs] + [(x, hi[1]) for x in xs] + [(lo[0], y) for y in ys] + [(hi[0], y) for y in ys]
    return np.array([(x, y, 0.0) for x, y in edge])

def whole_board_in_image(T, rv, tv, margin=6.0):
    q = lens.project(outline(T), rv, tv, CAM.K, CAM.dist, False)
    return bool((q[:, 0] > margin).all() and (q[:, 0] < CAM.width - margin).all() and (q[:, 1] > margin).all() and (q[:, 1] < CAM.height - margin).all())

def poses(T, count, seed, reach=0.0, fill=(0.45, 0.8), tilt=35.0):
    """Poses like Plumbline's sample_poses: the board fills `fill` of the image width, tilted up to `tilt` degrees.
    reach = 0: only poses with the whole printed pattern inside the image are kept.
    reach > 0: the board centre may go that share of the way past the position where the board touches the border,
    so at reach 1 up to half of the board is outside. No pose is rejected."""
    rng = np.random.default_rng(seed); f = float(CAM.K[0, 0]); centre = np.array([*T.centre_mm, 0.0]); out = []
    while len(out) < count:
        i = len(out)
        fl = rng.uniform(*fill); z = f * T.width_mm / (fl * CAM.width)
        tx, ty = np.deg2rad(rng.uniform(-tilt, tilt, 2)); roll = np.deg2rad(rng.uniform(-20, 20))
        if i % 6 == 0: tx = ty = 0.0
        R = cv2.Rodrigues(np.array([0, 0, roll]))[0] @ cv2.Rodrigues(np.array([0, ty, 0]))[0] @ cv2.Rodrigues(np.array([tx, 0, 0]))[0]
        half_w = fl * CAM.width / 2; half_h = half_w * T.height_mm / T.width_mm
        sx = max(0.0, CAM.width / 2 - half_w) + reach * half_w; sy = max(0.0, CAM.height / 2 - half_h) + reach * half_h
        cu = CAM.K[0, 2] + rng.uniform(-sx, sx); cv_ = CAM.K[1, 2] + rng.uniform(-sy, sy)
        c = np.array([(cu - CAM.K[0, 2]) / f * z, (cv_ - CAM.K[1, 2]) / f * z, z])
        rv = cv2.Rodrigues(R)[0].reshape(3); tv = c - R @ centre
        if reach == 0.0 and not whole_board_in_image(T, rv, tv): continue
        out.append((rv, tv))
    return out

def truth(T, rv, tv):
    return lens.project(T.object_points(), rv, tv, CAM.K, CAM.dist, False)

def point_errors(T, det, rv, tv):
    """Distance in px from every detected point to the nearest true point of the board.
    Nearest, not same-numbered: a checkerboard or a circle grid may be numbered from either end, which is the
    same board for one camera. Spacing is tens of px, so a point within a few px of a true one is that point."""
    if len(det.ids) == 0: return np.zeros(0)
    tr = truth(T, rv, tv)
    return np.linalg.norm(det.corners[:, None, :] - tr[None, :, :], axis=2).min(axis=1)

def aligned_difference(K2, d2, step=40):
    """Mean and max px difference between the true camera and a model after the best rotation between them is taken out."""
    xs = np.arange(step / 2, CAM.width, step); ys = np.arange(step / 2, CAM.height, step)
    px = np.array([(x, y) for y in ys for x in xs], np.float64)
    rays = lens.pixel_directions(px, CAM.K, CAM.dist, False)
    resid = lambda w: (lens.project(rays, w, np.zeros(3), K2, d2, False) - px).ravel()
    sol = least_squares(resid, np.zeros(3), method="lm")
    d = np.linalg.norm(resid(sol.x).reshape(-1, 2), axis=1)
    return float(d.mean()), float(d.max())

def coverage(dets, nx=8, ny=6):
    """Share of an 8 x 6 grid over the image that holds at least one detected point."""
    hit = np.zeros((ny, nx), bool)
    for d in dets:
        for x, y in d.corners:
            if 0 <= x < CAM.width and 0 <= y < CAM.height: hit[int(y * ny / CAM.height), int(x * nx / CAM.width)] = True
    return float(hit.mean())

# Detectors as most code calls them, next to Plumbline's own (which lab.detect uses).
class _Det:  # the two fields point_errors reads
    def __init__(self, pts): self.corners = np.asarray(pts, np.float32).reshape(-1, 2); self.ids = np.arange(len(self.corners))

def classic_checkerboard(gray, T):
    """cv.findChessboardCorners followed by cv.cornerSubPix, as in OpenCV's calibration tutorial."""
    ok, c = cv2.findChessboardCorners(gray, (T.inner_cols, T.inner_rows))
    if not ok: return _Det([])
    c = cv2.cornerSubPix(gray, c, (11, 11), (-1, -1), (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001))
    return _Det(c)

def opencv_tags(gray, T, refine):
    """cv.aruco.ArucoDetector on the AprilGrid, two-bit border, with one of OpenCV's corner refinement methods.
    Point 4 t + k is corner k of tag t, the numbering of Target.object_points()."""
    p = cv2.aruco.DetectorParameters(); p.markerBorderBits = 2; p.cornerRefinementMethod = refine
    corners, ids, _ = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11), p).detectMarkers(gray)
    d = _Det(np.concatenate([c.reshape(-1, 2) for c in corners]) if ids is not None else [])
    if ids is not None: d.ids = np.concatenate([4 * int(t) + np.arange(4) for t in ids.ravel()]).astype(np.int32)
    return d
