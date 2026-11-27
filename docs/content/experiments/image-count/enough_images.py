"""Do I have enough calibration images? Calibrate on all of them, then on random halves, and see how much the camera moves.
Usage: python enough_images.py <folder with images>. Needs numpy and opencv-contrib-python 4.7 or later. Edit the board line to match yours."""
import sys, glob, numpy as np, cv2
folder = sys.argv[1]
board = cv2.aruco.CharucoBoard((10, 7), 30.0, 22.0, cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250))
det = cv2.aruco.CharucoDetector(board)
obj_all = board.getChessboardCorners().astype(np.float32)

views = []
for f in sorted(glob.glob(folder + "/*.png") + glob.glob(folder + "/*.jpg")):
    img = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
    cc, ci, _, _ = det.detectBoard(img)
    if ci is not None and len(ci) >= 6:
        views.append((obj_all[ci.ravel()], cc.reshape(-1, 2).astype(np.float32)))
size = img.shape[1], img.shape[0]
print(f"{len(views)} images with corners")

def calibrate(subset):
    rms, K, d, _, _ = cv2.calibrateCamera([views[i][0] for i in subset], [views[i][1] for i in subset], size, None, None)
    return rms, K, d

def map_difference(K1, d1, K2, d2):
    """Worst pixel distance between two cameras' undistortion maps, after the best rotation between them is removed."""
    xs, ys = np.meshgrid(np.arange(20, size[0], 40, dtype=np.float64), np.arange(20, size[1], 40, dtype=np.float64))
    px = np.stack([xs.ravel(), ys.ravel()], 1)
    rays = cv2.convertPointsToHomogeneous(cv2.undistortPoints(px.reshape(-1, 1, 2), K1, d1)).reshape(-1, 3)
    r = np.zeros(3)                                      # Gauss-Newton on the rotation only; it is tiny
    for _ in range(20):
        q, J = cv2.projectPoints(rays, r, np.zeros(3), K2, d2)
        res = (q.reshape(-1, 2) - px).ravel()
        r -= np.linalg.lstsq(J[:, 0:3], res, rcond=None)[0]
    q, _ = cv2.projectPoints(rays, r, np.zeros(3), K2, d2)
    return np.linalg.norm(q.reshape(-1, 2) - px, axis=1).max()

rms, K, d = calibrate(range(len(views)))
print(f"all {len(views)} images: RMS {rms:.3f} px, fx {K[0,0]:.1f}, cx {K[0,2]:.1f}, cy {K[1,2]:.1f}")
rng = np.random.default_rng(0)
fx, moved = [], []
for _ in range(10):
    half = rng.choice(len(views), len(views) // 2, replace=False)
    _, Kh, dh = calibrate(half)
    fx.append(Kh[0, 0]); moved.append(map_difference(K, d, Kh, dh))
print(f"10 random halves: fx {min(fx):.1f} to {max(fx):.1f}, undistortion map moved by up to {max(moved):.2f} px")
print("If the halves disagree by more than you can accept, take more images, in the places the current ones do not cover.")
