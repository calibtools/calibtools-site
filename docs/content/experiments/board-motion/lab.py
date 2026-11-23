"""A1 lab: what kind of board motion spoils a calibration image? Rendered images, known camera.

Uses Plumbline's own detector and solver (calibtools/plumbline) and its lens model; the renderer here
adds motion: the board pose may differ from row to row (rolling shutter) or be averaged over the
exposure (global shutter). Run: python lab.py <plumbline/src> <experiment>
"""
import sys, json, time
import numpy as np, cv2
sys.path.insert(0, sys.argv[1])
from plumbline.core import synth, lens
from plumbline.core.targets import Target, CHARUCO, CHECKERBOARD
from plumbline.core.detect import detect
from plumbline.core.calibrate import calibrate, projection_difference, suggest_exclusions

CAM = synth.default_camera()
_U, _V = np.meshgrid(np.arange(CAM.width, dtype=np.float64), np.arange(CAM.height, dtype=np.float64))
_D = lens.pixel_directions(np.stack([_U.ravel(), _V.ravel()], 1), CAM.K, CAM.dist, False).reshape(CAM.height, CAM.width, 3)
_TEX = {}

def texture(T, z):
    key = (T, round(float(z), 1))
    if key not in _TEX:
        if len(_TEX) > 40: _TEX.clear()
        tex, origin = synth.board_texture(T)
        m = synth.PX_PER_MM * float(z) / float(CAM.K[0, 0])
        if m > 1.0: tex = cv2.GaussianBlur(tex, (0, 0), 0.5 * m)
        _TEX[key] = (tex, origin)
    return _TEX[key]

def ideal(T, rvec, tvec, pose_of_row=None, bands=1):
    """Noise-free image. pose_of_row(s) -> (rvec, tvec) for s in [-0.5, 0.5] down the image; bands = how finely."""
    tex, origin = texture(T, np.asarray(tvec).ravel()[2])
    out = np.empty((CAM.height, CAM.width), np.float32)
    for b in range(bands):
        r0, r1 = b * CAM.height // bands, (b + 1) * CAM.height // bands
        if r1 == r0: continue
        rv, tv = (rvec, tvec) if pose_of_row is None else pose_of_row((b + 0.5) / bands - 0.5)
        R, _ = cv2.Rodrigues(np.asarray(rv, np.float64)); t = np.asarray(tv, np.float64).reshape(3)
        d = _D[r0:r1].reshape(-1, 3); n = R[:, 2]
        with np.errstate(divide="ignore", invalid="ignore"): s = (t @ n) / (d @ n)
        p = (d * s[:, None] - t) @ R
        mx = ((p[:, 0] + origin[0]) * synth.PX_PER_MM - 0.5).astype(np.float32)
        my = ((p[:, 1] + origin[1]) * synth.PX_PER_MM - 0.5).astype(np.float32)
        bad = ~np.isfinite(s) | (s <= 0); mx[bad] = -10; my[bad] = -10
        out[r0:r1] = cv2.remap(tex, mx.reshape(r1 - r0, CAM.width), my.reshape(r1 - r0, CAM.width), cv2.INTER_LINEAR,
                               borderMode=cv2.BORDER_CONSTANT, borderValue=120)
    return out

def finish(img, rng, blur=0.8, noise=2.0):
    img = cv2.GaussianBlur(img, (0, 0), blur) + rng.normal(0, noise, img.shape)
    return np.clip(img, 0, 255).astype(np.uint8)

def shifted(rvec, tvec, shift, rot_deg=0.0, centre=None):
    """Pose after moving the board by `shift` (mm, camera frame) and turning it rot_deg about its own normal through its centre."""
    R, _ = cv2.Rodrigues(np.asarray(rvec, np.float64)); t = np.asarray(tvec, np.float64).reshape(3).copy()
    if rot_deg:
        Rz, _ = cv2.Rodrigues(np.array([0, 0, np.deg2rad(rot_deg)])); c = np.asarray(centre, np.float64)
        t = t + R @ (c - Rz @ c); R = R @ Rz
    rv, _ = cv2.Rodrigues(R)
    return rv.reshape(3), t + np.asarray(shift, np.float64)

def rolling(T, rvec, tvec, rng, shift=(0, 0, 0), rot_deg=0.0, bands=240):
    """Rolling shutter: the board moves by `shift` / turns by rot_deg between the first and the last row."""
    c = np.array([*T.centre_mm, 0.0])
    return finish(ideal(T, rvec, tvec, lambda s: shifted(rvec, tvec, np.asarray(shift, float) * s, rot_deg * s, c), bands), rng)

def exposure(T, rvec, tvec, rng, shift=(0, 0, 0), rot_deg=0.0, steps=16, ramp=0.0):
    """Global shutter: the whole image integrates the board along the same motion. ramp>0 weights the end more (uneven motion)."""
    c = np.array([*T.centre_mm, 0.0]); acc = None; wsum = 0.0
    for k in range(steps):
        s = (k + 0.5) / steps - 0.5; w = 1.0 + ramp * 2 * s
        rv, tv = shifted(rvec, tvec, np.asarray(shift, float) * s, rot_deg * s, c)
        im = ideal(T, rv, tv) * w; acc = im if acc is None else acc + im; wsum += w
    return finish(acc / wsum, rng)

def still(T, rvec, tvec, rng): return finish(ideal(T, rvec, tvec), rng)

def session(T, poses, images):
    return [detect(im, T, f"{i + 1:02d}") for i, im in enumerate(images)]

def solve(T, dets, excluded=()):
    res = calibrate(dets, T, None, set(excluded))
    mean, worst = projection_difference(CAM.K, CAM.dist, res.camera_matrix, res.distortion, CAM.width, CAM.height)
    per = {v.index: float(v.rms_point) for v in res.views}
    amean, amax = aligned_difference(res.camera_matrix, res.distortion)
    return dict(rms=float(res.rms_point), fx=float(res.fx), fy=float(res.fy), cx=float(res.camera_matrix[0, 2]), cy=float(res.camera_matrix[1, 2]), views=len(res.views), truth_mean=mean, truth_max=worst, lens_mean=amean, lens_max=amax,
                per=per, flagged=sorted(int(i) for i in suggest_exclusions(res))), res

SAMPLE = Target(CHARUCO, 11, 8, 30.0, 22.0, "DICT_5X5_250")
def px_of(mm, z): return mm * float(CAM.K[0, 0]) / z

from scipy.optimize import least_squares
def aligned_difference(K2, d2, step=40):
    """Mean and max pixel difference between the true camera and a model, after the best rotation between the two is taken out.
    What is left cannot be absorbed by where the camera points: it is the error of the lens model itself."""
    xs = np.arange(step / 2, CAM.width, step); ys = np.arange(step / 2, CAM.height, step)
    px = np.array([(x, y) for y in ys for x in xs], np.float64)
    rays = lens.pixel_directions(px, CAM.K, CAM.dist, False)
    def resid(w):
        return (lens.project(rays, w, np.zeros(3), K2, d2, False) - px).ravel()
    sol = least_squares(resid, np.zeros(3), method="lm")
    diff = np.linalg.norm(resid(sol.x).reshape(-1, 2), axis=1)
    return float(diff.mean()), float(diff.max())
