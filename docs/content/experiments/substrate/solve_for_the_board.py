# A board bowed by 0.15 mm, described to the calibration as flat. numpy and opencv-python only.
import numpy as np, cv2
rng = np.random.default_rng(1)
W, H = 2448, 2048                                   # a 5 MP camera with a 12 mm lens
K = np.array([[3478., 0, 1224], [0, 3478., 1024], [0, 0, 1]])
D = np.array([-0.12, 0.08, 0.0004, -0.0003, 0])
nx, ny, sq = 9, 6, 25.0                             # inner corners of a 300 x 200 mm ChArUco board
flat = np.array([[i * sq, j * sq, 0] for j in range(ny) for i in range(nx)], np.float32)
real = flat.copy()
real[:, 2] = -0.15 * (1 - ((flat[:, 0] - 100) / 150) ** 2)    # 0.15 mm over the 300 mm plate
obj, img = [], []
while len(img) < 20:                                # 20 views, tilted up to 35 degrees
    rv = np.deg2rad(rng.uniform([-35, -35, -20], [35, 35, 20])); z = rng.uniform(450, 800)
    R = cv2.Rodrigues(rv)[0]
    t = np.array([rng.uniform(-.25, .25) * z, rng.uniform(-.2, .2) * z, z]) - R @ flat.mean(0)
    px = cv2.projectPoints(real, rv, t, K, D)[0].reshape(-1, 2)
    if px.min() > 20 and px[:, 0].max() < W - 20 and px[:, 1].max() < H - 20:
        obj.append(flat); img.append((px + rng.normal(0, 0.05, px.shape)).astype(np.float32))
rms, K1 = cv2.calibrateCamera(obj, img, (W, H), None, None)[:2]
# nx - 1: the top-right corner is held, with the first and the last one
out = cv2.calibrateCameraRO(obj, img, (W, H), nx - 1, None, None)
z = out[5].reshape(-1, 3)[:, 2]
print(f"calibrateCamera     RMS {rms:.3f} px   focal length {100 * (K1[0, 0] / 3478 - 1):+.3f} %")
print(f"calibrateCameraRO   RMS {out[0]:.3f} px   focal length {100 * (out[1][0, 0] / 3478 - 1):+.3f} %")
print(f"board it solved for: bow of {z.max() - z.min():.3f} mm between the corners"
      f" ({real[:, 2].max() - real[:, 2].min():.3f} mm in truth)")
