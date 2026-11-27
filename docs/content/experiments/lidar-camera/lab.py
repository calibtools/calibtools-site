"""A camera and a LiDAR fixed to each other, looking at a panel with four holes and four markers. Simulated scans and
simulated marker corners; the calibration itself is done by the functions printed in the guide (pipeline.py).
numpy, scipy and OpenCV. Lengths in meters."""
import numpy as np, cv2
from scipy.spatial.transform import Rotation as Rot
from pipeline import find_holes, kabsch

PANEL = (0.60, 0.40)
HOLE_R = 0.060
HOLES = np.array([[0.17, 0.12, 0], [0.43, 0.12, 0], [0.17, 0.28, 0], [0.40, 0.30, 0]])           # one hole off the rectangle
HOLES_SYMMETRIC = np.array([[0.17, 0.12, 0], [0.43, 0.12, 0], [0.17, 0.28, 0], [0.43, 0.28, 0]])
MARKER = 0.08                                                                                    # marker side
MARKER_ORIGINS = np.array([[0.02, 0.02], [0.50, 0.02], [0.02, 0.30], [0.50, 0.30]])              # top-left corner of each marker
MARKER_CORNERS = np.array([[[x, y, 0], [x + MARKER, y, 0], [x + MARKER, y + MARKER, 0], [x, y + MARKER, 0]] for x, y in MARKER_ORIGINS])
W, H = 1920, 1440
K = np.array([[1400., 0, 960], [0, 1400., 720], [0, 0, 1]]); DIST = np.array([-0.12, 0, 0, 0, 0.])

def T(R, t):
    M = np.eye(4); M[:3, :3] = R; M[:3, 3] = np.asarray(t, float).ravel(); return M
def inv(M):
    return T(M[:3, :3].T, -M[:3, :3].T @ M[:3, 3])

# LiDAR axes: x forward, y left, z up. Camera axes: z forward, x right, y down. The camera sits 12 cm above and 5 cm ahead.
R_CL0 = np.array([[0, -1, 0], [0, 0, -1], [1, 0, 0.]])
T_CAM_LIDAR = T(Rot.from_euler("xyz", [1.2, -0.8, 0.6], degrees=True).as_matrix() @ R_CL0, [0.02, 0.12, -0.05])

LIDARS = {  # name: (elevation angles in degrees or None for a dense random pattern, azimuth step in degrees)
    "16 lines": (np.arange(-15, 15.1, 2.0), 0.2),
    "32 lines": (np.arange(-16, 15.1, 1.0), 0.2),
    "64 lines": (np.arange(-16, 15.9, 0.5), 0.2),
    "128 lines": (np.arange(-16, 15.9, 0.25), 0.2),
    "dense": (None, 0.1),      # scans accumulated from a non-repetitive pattern: a point about every 0.1 degrees in both directions
}

def placement(rng, distance=(1.5, 4.0), spread=1.0, max_tilt=30, lidar_fov=(-15.0, 15.0)):
    """Pose of the panel in the camera frame: centre anywhere in the middle `spread` of the image, tilted up to max_tilt,
    all four markers in the image and the whole panel inside the LiDAR's vertical field of view."""
    for _ in range(10000):
        z = rng.uniform(*distance); u = W / 2 + rng.uniform(-0.42, 0.42) * spread * W; v = H / 2 + rng.uniform(-0.35, 0.35) * spread * H
        ray = cv2.undistortPoints(np.array([[[u, v]]], np.float64), K, DIST).reshape(2); centre = np.array([ray[0] * z, ray[1] * z, z])
        ax = rng.normal(size=2); ax = np.r_[ax / np.linalg.norm(ax), 0]
        R = (Rot.from_rotvec(np.deg2rad(rng.uniform(0, max_tilt)) * ax) * Rot.from_euler("z", rng.uniform(-10, 10), degrees=True)).as_matrix()
        M = T(R, centre - R @ np.array([PANEL[0] / 2, PANEL[1] / 2, 0]))
        px = cv2.projectPoints(MARKER_CORNERS.reshape(-1, 3), cv2.Rodrigues(R)[0], M[:3, 3], K, DIST)[0].reshape(-1, 2)
        if not ((px[:, 0] > 20) & (px[:, 0] < W - 20) & (px[:, 1] > 20) & (px[:, 1] < H - 20)).all(): continue
        Tl = inv(T_CAM_LIDAR) @ M; c = (Tl[:3, :3] @ np.array([[0, 0, 0], [PANEL[0], 0, 0], [PANEL[0], PANEL[1], 0], [0, PANEL[1], 0]]).T).T + Tl[:3, 3]
        el = np.degrees(np.arctan2(c[:, 2], np.linalg.norm(c[:, :2], axis=1)))
        if el.min() > lidar_fov[0] and el.max() < lidar_fov[1]: return M           # the whole panel inside the LiDAR's vertical field too
    raise RuntimeError("no placement")

def scan(T_lidar_board, lidar, rng, range_noise=0.004, range_bias=0.0, holes=HOLES, hole_r=HOLE_R, bow=0.0):
    """Points the LiDAR returns from the panel, and the scan line of each (None for the dense pattern): every beam that
    meets the panel outside a hole, with range noise.
    Beams have no width here: a beam either hits the panel or goes through."""
    elev, az_step = LIDARS[lidar]
    Tb = inv(T_lidar_board); n = T_lidar_board[:3, 2]; p0 = T_lidar_board[:3, 3]
    corners = (T_lidar_board[:3, :3] @ np.array([[0, 0, 0], [PANEL[0], 0, 0], [PANEL[0], PANEL[1], 0], [0, PANEL[1], 0]]).T).T + p0
    az_c = np.degrees(np.arctan2(corners[:, 1], corners[:, 0])); el_c = np.degrees(np.arctan2(corners[:, 2], np.linalg.norm(corners[:, :2], axis=1)))
    az = np.arange(az_c.min() - 1, az_c.max() + 1, az_step) + rng.uniform(0, az_step)
    if elev is None: el = np.arange(el_c.min() - 1, el_c.max() + 1, az_step) + rng.uniform(0, az_step)
    else: el = elev[(elev > el_c.min() - 1) & (elev < el_c.max() + 1)]
    if len(el) == 0: return np.zeros((0, 3)), np.zeros(0, int)
    A, E = np.meshgrid(np.radians(az), np.radians(el))
    if elev is None: A = A + np.radians(rng.uniform(-az_step / 2, az_step / 2, A.shape)); E = E + np.radians(rng.uniform(-az_step / 2, az_step / 2, E.shape))
    d = np.stack([np.cos(E) * np.cos(A), np.cos(E) * np.sin(A), np.sin(E)], -1).reshape(-1, 3)
    ring = np.repeat(np.arange(len(el)), A.shape[1])
    with np.errstate(divide="ignore", invalid="ignore"): s = (p0 @ n) / (d @ n)
    hit = d * s[:, None]; b = (hit - p0) @ T_lidar_board[:3, :3]
    ok = np.isfinite(s) & (s > 0) & (b[:, 0] > 0) & (b[:, 0] < PANEL[0]) & (b[:, 1] > 0) & (b[:, 1] < PANEL[1])
    for h in holes: ok &= np.hypot(b[:, 0] - h[0], b[:, 1] - h[1]) > hole_r
    r = s[ok] + range_bias + rng.normal(0, range_noise, int(ok.sum()))
    if bow:                                                 # a panel bowed along its long side: the middle stands `bow` meters proud
        r = r - bow * (1 - ((b[ok, 0] - PANEL[0] / 2) / (PANEL[0] / 2)) ** 2) / np.abs(d[ok] @ n)
    return d[ok] * r[:, None], (None if elev is None else ring[ok])

def see_markers(T_cam_board, rng, pixel_noise=0.3, Kc=K, scale=1.0):
    """Board pose as the camera measures it: 16 marker corners with noise, then solvePnP."""
    px = cv2.projectPoints(MARKER_CORNERS.reshape(-1, 3), cv2.Rodrigues(T_cam_board[:3, :3])[0], T_cam_board[:3, 3], K, DIST)[0].reshape(-1, 2)
    ok, rvec, tvec = cv2.solvePnP(MARKER_CORNERS.reshape(-1, 3) * scale, px + rng.normal(0, pixel_noise, px.shape), Kc, DIST, flags=cv2.SOLVEPNP_IPPE)
    return T(cv2.Rodrigues(rvec)[0], tvec)

def errors(T_est):
    """Rotation error (degrees), translation error (mm) and how far off a LiDAR point 20 m ahead lands in the camera frame (mm)."""
    dR = T_est[:3, :3] @ T_CAM_LIDAR[:3, :3].T
    p = np.array([20.0, 0, 0, 1])
    return (float(np.degrees(np.arccos(np.clip((np.trace(dR) - 1) / 2, -1, 1)))), float(1000 * np.linalg.norm(T_est[:3, 3] - T_CAM_LIDAR[:3, 3])),
            float(1000 * np.linalg.norm((T_est @ p - T_CAM_LIDAR @ p)[:3])))

def calibrate(placements, holes=HOLES, hole_r=HOLE_R, max_misfit=0.01):
    """The solve of the guide: hole centres from each cloud, the same centres through the marker pose, one rigid fit.
    placements: list of (T_cam_board as the camera measured it, cloud, scan line of each point or None).
    Returns T_cam_lidar, the fit residuals (m) and the number of placements used; None when fewer than two are usable."""
    P_lidar, P_cam = [], []
    for T_cam_board, cloud, line in placements:
        if len(cloud) < 30: continue
        centres, misfit = find_holes(cloud, holes, hole_r, line)
        if centres is None or misfit > max_misfit: continue
        P_lidar.append(centres); P_cam.append((T_cam_board[:3, :3] @ holes.T).T + T_cam_board[:3, 3])
    if len(P_lidar) < 2: return None
    used = len(P_lidar); P_lidar, P_cam = np.vstack(P_lidar), np.vstack(P_cam)
    Tm = kabsch(P_lidar, P_cam)
    return Tm, np.linalg.norm((Tm[:3, :3] @ P_lidar.T).T + Tm[:3, 3] - P_cam, axis=1), used
