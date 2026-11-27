"""The hole finder this guide printed before its rework (an occupancy grid, empty blobs, a circle fit to the points around
each blob), kept to measure it on the same simulated scans. Not used by the guide any more."""
import itertools
import cv2
import numpy as np

def fit_plane(pts):
    """Least-squares plane through pts. Returns centroid, unit normal."""
    c = pts.mean(axis=0)
    _, _, vt = np.linalg.svd(pts - c, full_matrices=False)
    return c, vt[2]

def plane_basis(n):
    a = np.array([1.0, 0, 0]) if abs(n[0]) < 0.9 else np.array([0, 1.0, 0])
    u = np.cross(n, a); u /= np.linalg.norm(u)
    return u, np.cross(n, u)

def find_holes(pts, hole_radius, cell=0.01, n_holes=4):
    """3D centers of circular holes in a planar cloud (same frame as pts)."""
    c, n = fit_plane(pts)
    u, v = plane_basis(n)
    d = pts - c
    xy = np.stack([d @ u, d @ v], axis=1)
    lo = xy.min(axis=0) - cell; hi = xy.max(axis=0) + cell
    size = np.ceil((hi - lo) / cell).astype(int)
    occ = np.zeros(size[::-1], np.uint8)
    ij = ((xy - lo) / cell).astype(int)
    occ[ij[:, 1], ij[:, 0]] = 255
    occ = cv2.morphologyEx(occ, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    num, lab, stats, cent = cv2.connectedComponentsWithStats((occ == 0).astype(np.uint8), connectivity=4)
    area = np.pi * (hole_radius / cell) ** 2
    centers = []
    for k in range(1, num):
        x, y, w, h, a = stats[k]
        touches = x == 0 or y == 0 or x + w >= size[0] or y + h >= size[1]
        if touches or not (0.4 * area < a < 1.6 * area):
            continue
        c0 = cent[k] * cell + lo
        r = np.linalg.norm(xy - c0, axis=1)
        ring = xy[(r > hole_radius * 0.8) & (r < hole_radius * 1.6)]
        if len(ring) < 8:
            continue
        A = np.column_stack([ring[:, 0], ring[:, 1], np.ones(len(ring))])
        D, E, F = np.linalg.lstsq(A, -(ring ** 2).sum(axis=1), rcond=None)[0]
        centers.append(c + (-D / 2) * u + (-E / 2) * v)
    return np.array(centers[:n_holes])

def kabsch(P, Q):
    """Rigid T with Q ≈ R P + t for matched Nx3 arrays. Returns 4x4."""
    pc, qc = P.mean(axis=0), Q.mean(axis=0)
    U, _, Vt = np.linalg.svd((P - pc).T @ (Q - qc))
    S = np.diag([1, 1, np.sign(np.linalg.det(Vt.T @ U.T))])
    R = Vt.T @ S @ U.T
    T = np.eye(4); T[:3, :3] = R; T[:3, 3] = qc - R @ pc
    return T

def match_holes(centres_lidar, holes_board):
    best = None
    for perm in itertools.permutations(range(len(holes_board))):
        P = holes_board[list(perm)]
        T = kabsch(P, centres_lidar)
        res = np.linalg.norm((T[:3, :3] @ P.T).T + T[:3, 3] - centres_lidar, axis=1).max()
        if best is None or res < best[0]:
            best = (res, T, list(perm))
    return best   # (max residual in meters, T_lidar_board, order)
