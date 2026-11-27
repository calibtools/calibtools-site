"""The functions printed in the guide, in the order they appear there. Lengths in meters."""
import cv2
import numpy as np
from scipy.optimize import least_squares

def fit_plane(pts):
    """Least-squares plane through pts. Returns the centroid and two in-plane axes u, v with u x v pointing away from the sensor."""
    c = pts.mean(axis=0)
    n = np.linalg.svd(pts - c, full_matrices=False)[2][2]
    if n @ c < 0:
        n = -n
    a = np.array([0.0, 0, 1]) if abs(n[2]) < 0.9 else np.array([1.0, 0, 0])
    u = np.cross(a, n); u /= np.linalg.norm(u)
    return c, u, np.cross(n, u)

def strips(xy, width=0.015):
    """For a cloud with no scan lines (accumulated, non-repetitive): cut the panel into strips and use those as lines."""
    return np.floor(xy[:, 1] / width).astype(int)

def rim_points(xy, line, hole_radius):
    """Walk along every scan line. Where the points stop and start again, the beam went through a hole:
    the two ends of the gap lie on the rim of that hole."""
    rim = []
    for l in np.unique(line):
        p = xy[line == l]
        if len(p) < 4:
            continue
        d = p - p.mean(axis=0)
        along = d @ np.linalg.svd(d, full_matrices=False)[2][0]
        p = p[np.argsort(along)]
        step = np.linalg.norm(np.diff(p, axis=0), axis=1)
        usual = np.median(step)
        for i in np.where(step > max(3 * usual, 0.5 * hole_radius))[0]:
            e = (p[i + 1] - p[i]) / step[i]
            rim += [p[i] + e * usual / 2, p[i + 1] - e * usual / 2]   # the rim is half a step past the last return
    return np.array(rim).reshape(-1, 2)

def fit_layout(rim, holes_xy, hole_radius):
    """Turn and shift the known hole layout until every rim point lies on one of its circles.
    Returns the 2x2 rotation, the shift, the median distance of the rim points from the circles,
    and how many rim points each hole got."""
    def residual(x):
        c, s = np.cos(x[0]), np.sin(x[0])
        centres = holes_xy @ np.array([[c, s], [-s, c]]) + x[1:]
        return np.min(np.linalg.norm(rim[:, None, :] - centres[None, :, :], axis=2), axis=1) - hole_radius
    best = None
    for start in np.radians(np.arange(0, 360, 10)):
        c, s = np.cos(start), np.sin(start)
        x0 = np.r_[start, rim.mean(axis=0) - (holes_xy @ np.array([[c, s], [-s, c]])).mean(axis=0)]
        sol = least_squares(residual, x0, loss="soft_l1", f_scale=0.01)
        if best is None or sol.cost < best.cost:
            best = sol
    c, s = np.cos(best.x[0]), np.sin(best.x[0])
    centres = holes_xy @ np.array([[c, s], [-s, c]]) + best.x[1:]
    d = np.abs(np.linalg.norm(rim[:, None, :] - centres[None, :, :], axis=2) - hole_radius)
    on_rim = (d < 0.015).sum(axis=0)                     # rim points on each hole
    return np.array([[c, -s], [s, c]]), best.x[1:], float(np.median(d.min(axis=1))), on_rim

def find_holes(pts, holes_board, hole_radius, line=None):
    """Hole centres in the sensor frame, in the order of holes_board, and the median misfit of the rim points (m).
    Returns (None, inf) when some hole has no scan line across it.
    `line` is the scan line of each point (the ring index of a spinning LiDAR); leave it out for a dense cloud."""
    c, u, v = fit_plane(pts)
    xy = np.stack([(pts - c) @ u, (pts - c) @ v], axis=1)
    rim = rim_points(xy, strips(xy) if line is None else line, hole_radius)
    if len(rim) < 8:
        return None, np.inf
    R, t, misfit, on_rim = fit_layout(rim, holes_board[:, :2], hole_radius)
    if on_rim.min() < 2:                                 # a hole no scan line crossed: the layout could sit anywhere
        return None, np.inf
    centres = holes_board[:, :2] @ R.T + t
    return c + centres[:, :1] * u + centres[:, 1:] * v, misfit

def kabsch(P, Q):
    """Rigid T with Q ≈ R P + t for matched Nx3 arrays. Returns 4x4."""
    pc, qc = P.mean(axis=0), Q.mean(axis=0)
    U, _, Vt = np.linalg.svd((P - pc).T @ (Q - qc))
    S = np.diag([1, 1, np.sign(np.linalg.det(Vt.T @ U.T))])
    R = Vt.T @ S @ U.T
    T = np.eye(4); T[:3, :3] = R; T[:3, 3] = qc - R @ pc
    return T
