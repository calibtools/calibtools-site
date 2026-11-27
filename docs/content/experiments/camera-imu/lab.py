"""A camera and an IMU fixed to each other, moved by hand in front of a calibration grid, and a small estimator of the
transform and the time offset between them. This is NOT Kalibr: it fits splines to the camera poses and then solves for the
camera-IMU transform, the time offset, the IMU biases and gravity against the IMU samples. numpy, scipy and OpenCV."""
import numpy as np, cv2
from scipy.spatial.transform import Rotation as Rot
from scipy.interpolate import make_lsq_spline
from scipy.optimize import least_squares
from scipy.signal import savgol_filter

W, H = 1920, 1440
K = np.array([[2250., 0, 960], [0, 2250., 720], [0, 0, 1]]); DIST = np.array([-0.12, 0, 0, 0, 0.])
GRID = np.array([[c * 0.025, r * 0.025, 0] for r in range(1, 9) for c in range(1, 12)], np.float64)   # 88 points on 0.3 x 0.225 m, meters
GRID_CENTRE = np.array([0.15, 0.1125, 0.0])
G_WORLD = np.array([0, 9.81, 0.0])                    # gravity in the grid frame; the grid hangs on a wall
CAM_HZ, IMU_HZ = 20.0, 200.0
# IMU noise, continuous time, the example values of the guide
GYRO_N, GYRO_RW, ACC_N, ACC_RW = 1.87e-4, 2.66e-5, 1.86e-3, 4.33e-4
# what the calibration should find: T_cam_imu takes IMU coordinates to camera coordinates
R_CI_TRUE = (Rot.from_euler("xyz", [1.5, -2.0, 0.8], degrees=True) * Rot.from_euler("z", 90, degrees=True)).as_matrix()
P_CI_TRUE = np.array([-0.0215, -0.0647, 0.0096])      # IMU origin in the camera frame, m

def motion(rng, duration=60.0, rot_deg=(18, 18, 18), trans_m=(0.07, 0.07, 0.05), speed=1.0):
    """A smooth hand motion of the camera in front of the grid: sums of three sines per axis.
    Returns functions of time for the camera rotation (world from camera), position, and their derivatives."""
    f = lambda: speed * rng.uniform(0.25, 0.9, 3); ph = lambda: rng.uniform(0, 2 * np.pi, 3)
    fr, pr, ft, pt = [f() for _ in range(3)], [ph() for _ in range(3)], [f() for _ in range(3)], [ph() for _ in range(3)]
    amp_r = np.deg2rad(np.array(rot_deg)) / 3; amp_t = np.array(trans_m) / 3
    R0 = Rot.from_euler("x", 180, degrees=True)        # the camera sits 0.55 m in front of the grid and looks at it
    p0 = GRID_CENTRE + np.array([0, 0, 0.55])
    def rotvec(t):
        t = np.atleast_1d(t)[:, None]
        return np.stack([amp_r[a] * sum(np.sin(2 * np.pi * fr[a][k] * t[:, 0] + pr[a][k]) for k in range(3)) for a in range(3)], 1)
    def R_wc(t): return (R0 * Rot.from_rotvec(rotvec(t))).as_matrix()
    def p_wc(t, d=0):
        t = np.atleast_1d(t); out = np.zeros((len(t), 3))
        for a in range(3):
            for k in range(3):
                w = 2 * np.pi * ft[a][k]; arg = w * t + pt[a][k]
                out[:, a] += amp_t[a] * (np.sin(arg) if d == 0 else -w * w * np.sin(arg))
        return out + (p0 if d == 0 else 0)
    def omega_c(t, h=1e-4):                              # angular velocity in the camera frame
        Ra, Rb = R_wc(np.atleast_1d(t) - h), R_wc(np.atleast_1d(t) + h)
        return Rot.from_matrix(np.einsum("nji,njk->nik", Ra, Rb)).as_rotvec() / (2 * h)
    return R_wc, p_wc, omega_c

def record(rng, duration=60.0, td=0.004, pixel_noise=0.1, cam_jitter=0.0, imu_batch=1, grid_scale=1.0, shock=False, **mo):
    """One recording. Camera stamps are t - td, so t_imu = t_cam + td. Returns camera stamps and poses (as a camera calibration
    would measure them from the grid) and IMU stamps, gyro and accelerometer samples."""
    R_wc, p_wc, omega_c = motion(rng, duration, **mo)
    # camera
    tc = np.arange(0.5, duration - 0.5, 1 / CAM_HZ); Rm, pm, keep = [], [], []
    Rs, ps = R_wc(tc), p_wc(tc)
    for j in range(len(tc)):
        R_cw = Rs[j].T; t_cw = -R_cw @ ps[j]
        px = cv2.projectPoints(GRID, cv2.Rodrigues(R_cw)[0], t_cw, K, DIST)[0].reshape(-1, 2)
        ok = (px[:, 0] > 10) & (px[:, 0] < W - 10) & (px[:, 1] > 10) & (px[:, 1] < H - 10) & ((GRID @ R_cw[2] + t_cw[2]) > 0.1)
        if ok.sum() < 24: continue
        good, rvec, tvec = cv2.solvePnP(GRID[ok] * grid_scale, px[ok] + rng.normal(0, pixel_noise, (int(ok.sum()), 2)), K, DIST, flags=cv2.SOLVEPNP_IPPE)
        Rj = cv2.Rodrigues(rvec)[0]; Rm.append(Rj.T); pm.append(-Rj.T @ tvec.ravel()); keep.append(j)
    stamps_c = tc[keep] - td + (rng.uniform(0, cam_jitter, len(keep)) if cam_jitter else 0)
    # IMU
    ti = np.arange(0, duration, 1 / IMU_HZ); n = len(ti)
    Rwc = R_wc(ti); om_c = omega_c(ti); al_c = (omega_c(ti + 1e-3) - omega_c(ti - 1e-3)) / 2e-3
    R_wi = Rwc @ R_CI_TRUE
    acc_w = p_wc(ti, 2) + np.einsum("nij,nj->ni", Rwc, np.cross(al_c, P_CI_TRUE) + np.cross(om_c, np.cross(om_c, P_CI_TRUE)))
    bg = 0.002 * rng.normal(size=3) + np.cumsum(rng.normal(0, GYRO_RW / np.sqrt(IMU_HZ), (n, 3)), 0)
    ba = 0.05 * rng.normal(size=3) + np.cumsum(rng.normal(0, ACC_RW / np.sqrt(IMU_HZ), (n, 3)), 0)
    gyro = om_c @ R_CI_TRUE + bg + rng.normal(0, GYRO_N * np.sqrt(IMU_HZ), (n, 3))        # omega_imu = R_ic omega_c
    acc = np.einsum("nji,nj->ni", R_wi, acc_w - G_WORLD) + ba + rng.normal(0, ACC_N * np.sqrt(IMU_HZ), (n, 3))
    if shock:                                              # picking the rig up: a short jolt in the first second the camera does not see
        k = (ti > 0.6) & (ti < 0.75); acc[k] += 25 * np.sin(np.linspace(0, 6 * np.pi, k.sum()))[:, None] * np.array([1, 0.6, -0.8])
    stamps_i = ti.copy()
    if imu_batch > 1:                                      # the driver delivers samples in bursts and stamps each burst on arrival
        stamps_i = ti[np.minimum((np.arange(n) // imu_batch + 1) * imu_batch - 1, n - 1)]
    return dict(tc=stamps_c, R_wc=np.array(Rm), p_wc=np.array(pm), ti=stamps_i, gyro=gyro, acc=acc)

def fit_spline(t, y, spacing=0.2, k=5):
    """Least-squares B-spline of degree 5 with a knot every `spacing` seconds: 20 Hz camera poses give four samples per knot."""
    for sp in (spacing, 2 * spacing, 4 * spacing):
        inner = np.arange(t[0] + sp, t[-1] - sp / 2, sp)
        try: return make_lsq_spline(t, y, np.r_[[t[0]] * (k + 1), inner, [t[-1]] * (k + 1)], k=k)
        except (ValueError, np.linalg.LinAlgError): continue
    raise RuntimeError("camera poses too sparse for a spline")

def calibrate(rec, estimate_td=True, trim=(1.0, 1.0), x_start=None, debug=False):
    """Estimate T_cam_imu and the time offset. Returns rotation (3x3, camera from IMU), translation (IMU origin in the camera
    frame, m), time offset (s) and the residuals' standard deviations."""
    tc = rec["tc"]; order = np.argsort(tc); tc = tc[order]; Rm = rec["R_wc"][order]; pm = rec["p_wc"][order]
    keep = np.r_[True, np.diff(tc) > 1e-6]; tc, Rm, pm = tc[keep], Rm[keep], pm[keep]
    R_ref = Rot.from_matrix(Rm[len(Rm) // 2])
    rv = (R_ref.inv() * Rot.from_matrix(Rm)).as_rotvec()
    sp_p = [fit_spline(tc, pm[:, a]) for a in range(3)]; sp_r = [fit_spline(tc, rv[:, a]) for a in range(3)]
    grid = np.arange(tc[0], tc[-1], 1e-3)
    Rg = R_ref * Rot.from_rotvec(np.stack([s(grid) for s in sp_r], 1))
    om = (Rg[:-2].inv() * Rg[2:]).as_rotvec() / 2e-3; om = np.vstack([om[:1], om, om[-1:]]); al = np.gradient(om, 1e-3, axis=0)
    def at(s):
        R = (R_ref * Rot.from_rotvec(np.stack([f(s) for f in sp_r], 1))).as_matrix()
        return (R, np.stack([f(s, 2) for f in sp_p], 1), np.stack([np.interp(s, grid, om[:, a]) for a in range(3)], 1),
                np.stack([np.interp(s, grid, al[:, a]) for a in range(3)], 1))
    # the lever-arm terms need angular velocity and acceleration: taken from the gyro (smoothed over 0.2 s), which is far
    # cleaner than the second derivative of the camera rotation
    gs = savgol_filter(rec["gyro"], 41, 3, axis=0); ga = savgol_filter(rec["gyro"], 41, 3, deriv=1, delta=1 / IMU_HZ, axis=0)
    use = (rec["ti"] > tc[0] + trim[0]) & (rec["ti"] < tc[-1] - trim[1]); ti, gyro, acc, gs, ga = rec["ti"][use], rec["gyro"][use], rec["acc"][use], gs[use], ga[use]
    def resid(x, split=False):
        R_ic = Rot.from_rotvec(x[:3]).as_matrix(); p = x[3:6]; td = x[6] if estimate_td else 0.0
        R, pdd, w, a = at(ti - td)
        rg = w @ R_ic.T + x[7:10] - gyro
        wc = (gs - x[7:10]) @ R_ic; ac = ga @ R_ic                    # the same, seen in the camera frame
        acc_w = pdd + np.einsum("nij,nj->ni", R, np.cross(ac, p) + np.cross(wc, np.cross(wc, p)))
        ra = np.einsum("nij,nj->ni", np.einsum("ij,nkj->nik", R_ic, R), acc_w - x[13:16]) + x[10:13] - acc
        return (rg, ra) if split else np.concatenate([rg.ravel() / 0.01, ra.ravel() / 0.1])
    # start: rotation from the two angular velocities (Kabsch), everything else zero, gravity from the mean accelerometer reading
    R0, w0 = at(ti)[0], at(ti)[2]
    U, _, Vt = np.linalg.svd((gyro - gyro.mean(0)).T @ (w0 - w0.mean(0))); R_ic0 = U @ np.diag([1, 1, np.linalg.det(U @ Vt)]) @ Vt
    g0 = -np.einsum("nij,nj->ni", R0 @ R_ic0.T, acc).mean(0)
    x0 = np.r_[Rot.from_matrix(R_ic0).as_rotvec(), np.zeros(3), 0.0, np.zeros(6), g0]
    if x_start is not None: x0 = x_start
    if debug: return resid, x0
    sol = least_squares(resid, x0, method="trf", x_scale=np.r_[np.ones(3), 0.1 * np.ones(3), 0.01, 0.01 * np.ones(3), 0.1 * np.ones(3), np.ones(3)], max_nfev=60)
    rg, ra = resid(sol.x, split=True)
    return dict(R_ci=Rot.from_rotvec(sol.x[:3]).as_matrix().T, p_ci=sol.x[3:6], td=float(sol.x[6]) if estimate_td else 0.0,
                gyro_resid=float(rg.std()), acc_resid=float(ra.std()), gravity=float(np.linalg.norm(sol.x[13:16])))

def errors(res, td_true):
    dR = res["R_ci"] @ R_CI_TRUE.T
    return (float(np.degrees(np.arccos(np.clip((np.trace(dR) - 1) / 2, -1, 1)))), float(1000 * np.linalg.norm(res["p_ci"] - P_CI_TRUE)), float(1000 * (res["td"] - td_true)))
