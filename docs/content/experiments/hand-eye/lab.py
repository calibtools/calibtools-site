"""A simulated robot cell: camera on the flange, ChArUco board fixed in the cell. Points only, no rendered images.
numpy, scipy and OpenCV."""
import numpy as np, cv2
from scipy.spatial.transform import Rotation as Rot
W, H = 1920, 1440
K = np.array([[2250., 0, 960], [0, 2250., 720], [0, 0, 1]])
DIST = np.array([-0.12, 0, 0, 0, 0.])
COLS, ROWS, SQ = 10, 7, 25.0                                   # 250 x 175 mm board, 25 mm squares
BOARD = np.array([[c * SQ, r * SQ, 0] for r in range(1, ROWS) for c in range(1, COLS)], np.float64)   # 54 inner corners, mm
CENTRE = np.array([COLS * SQ / 2, ROWS * SQ / 2, 0])
METHODS = {"Tsai": cv2.CALIB_HAND_EYE_TSAI, "Park": cv2.CALIB_HAND_EYE_PARK, "Horaud": cv2.CALIB_HAND_EYE_HORAUD,
           "Andreff": cv2.CALIB_HAND_EYE_ANDREFF, "Daniilidis": cv2.CALIB_HAND_EYE_DANIILIDIS}

def T(R, t):
    M = np.eye(4); M[:3, :3] = R; M[:3, 3] = np.asarray(t, float).ravel(); return M
def inv(M):
    return T(M[:3, :3].T, -M[:3, :3].T @ M[:3, 3])

# the two fixed transforms of the cell, the things a calibration does not know
X_TRUE = T(Rot.from_euler("xyz", [4, -7, 12], degrees=True).as_matrix(), [35, -48, 82])        # camera in the flange frame, mm
T_TARGET2BASE = T(Rot.from_euler("xyz", [178, 3, 25], degrees=True).as_matrix(), [620, -90, 15])  # board lying in the cell, mm

def camera_view(rng, max_tilt, roll, axes="all", distance=(420, 580), aim=0.25, tilt=None):
    """Pose of the board in the camera frame: the camera looks at the board from up to `max_tilt` degrees off its normal,
    rolled up to `roll` degrees about its own axis. axes='one' tilts about the board's x axis only, with no roll."""
    for _ in range(10000):
        a = rng.uniform(-max_tilt, max_tilt) if tilt is None else tilt
        if axes == "one": R = Rot.from_euler("x", a, degrees=True).as_matrix()
        else:
            az = rng.uniform(0, 2 * np.pi); ax = np.array([np.cos(az), np.sin(az), 0])
            R = (Rot.from_rotvec(np.deg2rad(abs(a)) * ax) * Rot.from_euler("z", rng.uniform(-roll, roll), degrees=True)).as_matrix()
        z = rng.uniform(*distance)
        centre = np.array([rng.uniform(-aim, aim) * W * z / K[0, 0], rng.uniform(-aim, aim) * H * z / K[1, 1], z])
        M = T(R, centre - R @ CENTRE)
        p = project(M)
        if ((p[:, 0] > 10) & (p[:, 0] < W - 10) & (p[:, 1] > 10) & (p[:, 1] < H - 10)).sum() >= 20: return M
    raise RuntimeError("no view")

def project(T_target2cam, Kc=K, dist=DIST, pts=BOARD):
    r, _ = cv2.Rodrigues(T_target2cam[:3, :3])
    return cv2.projectPoints(pts, r, T_target2cam[:3, 3], Kc, dist)[0].reshape(-1, 2)

def see(T_target2cam, rng, pixel_noise, Kc=K, dist=DIST, square_scale=1.0):
    """What the camera side of a calibration produces: corners with noise, then solvePnP with the camera model it was given."""
    p = project(T_target2cam)
    ok = (p[:, 0] > 10) & (p[:, 0] < W - 10) & (p[:, 1] > 10) & (p[:, 1] < H - 10)
    img = p[ok] + rng.normal(0, pixel_noise, (int(ok.sum()), 2))
    good, rvec, tvec = cv2.solvePnP(BOARD[ok] * square_scale, img, Kc, dist, flags=cv2.SOLVEPNP_IPPE)
    return T(cv2.Rodrigues(rvec)[0], tvec)

def read_robot(T_gripper2base, rng, mm, deg):
    """The pose the controller reports: the true flange pose with a small random error."""
    dR = Rot.from_rotvec(np.deg2rad(rng.normal(0, deg, 3))).as_matrix()
    return T(dR @ T_gripper2base[:3, :3], T_gripper2base[:3, 3] + rng.normal(0, mm, 3))

def session(rng, n=20, max_tilt=30, roll=30, axes="all", robot=(0.05, 0.01), pixel_noise=0.1, translate_only=False, **cam):
    """n robot poses. Returns the true flange poses, the reported ones and the board poses the camera measured."""
    true_g2b, read_g2b, t2c = [], [], []
    first = camera_view(rng, max_tilt, roll, axes)
    for i in range(n):
        view = camera_view(rng, max_tilt, roll, axes)
        if translate_only: view = T(first[:3, :3], view[:3, 3] + view[:3, :3] @ CENTRE - first[:3, :3] @ CENTRE)
        g2b = T_TARGET2BASE @ inv(view) @ inv(X_TRUE)
        true_g2b.append(g2b); read_g2b.append(read_robot(g2b, rng, *robot)); t2c.append(see(view, rng, pixel_noise, **cam))
    return true_g2b, read_g2b, t2c

def session_eye_to_hand(rng, n=20, max_tilt=30, roll=30, robot=(0.05, 0.01), pixel_noise=0.1):
    """Camera fixed in the cell, board on the flange. Here X_TRUE is the camera in the base frame and the board keeps the
    pose T_TARGET2BASE in the flange frame: the same two transforms with base and flange swapped."""
    read_g2b, t2c = [], []
    for i in range(n):
        view = camera_view(rng, max_tilt, roll)
        b2g = T_TARGET2BASE @ inv(view) @ inv(X_TRUE)
        read_g2b.append(read_robot(inv(b2g), rng, *robot)); t2c.append(see(view, rng, pixel_noise))
    return read_g2b, t2c

def solve(g2b, t2c, method="Park"):
    """cv2.calibrateHandEye for a camera on the flange. None when OpenCV fails or returns something that is not a pose."""
    try:
        R, t = cv2.calibrateHandEye([m[:3, :3] for m in g2b], [m[:3, 3] for m in g2b], [m[:3, :3] for m in t2c], [m[:3, 3] for m in t2c], method=METHODS[method])
    except cv2.error: return None
    if not (np.all(np.isfinite(R)) and np.all(np.isfinite(t))) or abs(np.linalg.det(R) - 1) > 1e-3: return None
    return T(R, t)

def errors(X):
    """Rotation error (degrees), translation error (mm), and how far off a point 500 mm in front of the camera lands (mm)."""
    dR = X[:3, :3] @ X_TRUE[:3, :3].T
    rot = float(np.degrees(np.arccos(np.clip((np.trace(dR) - 1) / 2, -1, 1))))
    p = np.array([0, 0, 500, 1.0])
    return rot, float(np.linalg.norm(X[:3, 3] - X_TRUE[:3, 3])), float(np.linalg.norm((X @ p - X_TRUE @ p)[:3]))

def target_spread(X, g2b, t2c):
    """The check from the guide: where each pose puts the board in the base frame. Returns each pose's distance from the mean, mm."""
    pos = np.array([(g @ X @ c)[:3, 3] for g, c in zip(g2b, t2c)])
    return np.linalg.norm(pos - pos.mean(0), axis=1)
