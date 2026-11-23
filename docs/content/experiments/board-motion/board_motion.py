"""What a board that moves during a rolling-shutter readout does to an OpenCV calibration.

No images: corner positions are projected through a known camera, so the result can be
compared with the truth. Needs numpy and opencv-python.
"""
import numpy as np
import cv2

W, H = 1280, 960
K_TRUE = np.array([[1500.0, 0, 640], [0, 1500.0, 480], [0, 0, 1]])
DIST_TRUE = np.array([-0.12, 0.10, 0.0005, -0.0003, 0.0])
SQUARE = 30.0                                  # mm
grid = np.mgrid[0:10, 0:7].T.reshape(-1, 2)    # 10 x 7 inner corners
BOARD = np.c_[grid * SQUARE, np.zeros(len(grid))].astype(np.float32)


def random_pose(rng):
    """A board about 0.5 to 0.9 m away, tilted up to 35 degrees, somewhere in the image."""
    z = rng.uniform(500, 900)
    rvec = np.deg2rad([rng.uniform(-35, 35), rng.uniform(-35, 35), rng.uniform(-20, 20)])
    centre = np.array([rng.uniform(-0.15, 0.15) * z, rng.uniform(-0.1, 0.1) * z, z])
    R, _ = cv2.Rodrigues(rvec)
    return rvec, centre - R @ np.array([135.0, 90.0, 0.0])


def observe(rvec, tvec, rng, shift_mm=0.0, noise_px=0.05):
    """Corner positions in the image. With shift_mm, the board moves sideways by that much
    between the first and the last image row: each corner is seen where the board was
    when its own row was read out."""
    px, _ = cv2.projectPoints(BOARD, rvec, tvec, K_TRUE, DIST_TRUE)
    px = px.reshape(-1, 2)
    if shift_mm:
        for _ in range(3):                     # the row a corner lands on depends on the shift
            when = px[:, 1] / H - 0.5          # -0.5 at the top row, +0.5 at the bottom row
            R, _ = cv2.Rodrigues(rvec)
            cam = BOARD @ R.T + tvec           # corners in the camera frame, in mm
            cam[:, 0] += shift_mm * when       # sideways, by a different amount for each row
            px, _ = cv2.projectPoints(cam.astype(np.float32), np.zeros(3), np.zeros(3), K_TRUE, DIST_TRUE)
            px = px.reshape(-1, 2)
    return (px + rng.normal(0, noise_px, px.shape)).astype(np.float32)


def per_view_rms(obj, img, K, dist, rvecs, tvecs):
    """Reprojection error of each view, in pixels (root mean square over its corners)."""
    out = []
    for o, i, r, t in zip(obj, img, rvecs, tvecs):
        proj, _ = cv2.projectPoints(o, r, t, K, dist)
        out.append(float(np.sqrt(np.mean(np.sum((proj.reshape(-1, 2) - i) ** 2, axis=1)))))
    return np.array(out)


def calibrate(img_points):
    obj = [BOARD for _ in img_points]
    rms, K, dist, rvecs, tvecs = cv2.calibrateCamera(obj, img_points, (W, H), None, None)
    return rms, K, per_view_rms(obj, img_points, K, dist, rvecs, tvecs)


if __name__ == "__main__":
    rng = np.random.default_rng(1)
    poses = [random_pose(rng) for _ in range(24)]
    moving = {6: 2.0, 17: -2.0}                # views 7 and 18: 2 mm during the readout
    views = [observe(r, t, rng, moving.get(i, 0.0)) for i, (r, t) in enumerate(poses)]

    rms, K, per_view = calibrate(views)
    print(f"all 24 views:   RMS {rms:.3f} px, fx {K[0, 0]:.1f}, cx {K[0, 2]:.1f}, cy {K[1, 2]:.1f}")
    print("per view:", " ".join(f"{e:.2f}" for e in per_view))

    suspects = np.flatnonzero(per_view > 3 * np.median(per_view))
    print("views above 3x the median:", (suspects + 1).tolist())

    kept = [v for i, v in enumerate(views) if i not in suspects]
    rms, K, _ = calibrate(kept)
    print(f"without them:   RMS {rms:.3f} px, fx {K[0, 0]:.1f}, cx {K[0, 2]:.1f}, cy {K[1, 2]:.1f}")
    print("true camera:    fx 1500.0, cx 640.0, cy 480.0")
