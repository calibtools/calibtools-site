"""A camera on a robot flange looks at a fixed board from 20 poses. How far the robot turns between poses decides the result.
Needs numpy and opencv-python (4.1 or later, but not 5.0)."""
import numpy as np, cv2

def T(rvec_deg, t):                                   # 4x4 pose from a rotation vector in degrees and a translation in mm
    M = np.eye(4); M[:3, :3] = cv2.Rodrigues(np.radians(np.array(rvec_deg, float)))[0]; M[:3, 3] = t; return M

X_true = T([4, -7, 12], [35, -48, 82])                # camera in the flange frame: what calibration should find
board_in_base = T([178, 3, 25], [620, -90, 15])       # the board lying in the cell

def calibrate(max_turn_deg, rng, poses=20):
    R_g2b, t_g2b, R_t2c, t_t2c = [], [], [], []
    for _ in range(poses):
        # where the camera sees the board: about 500 mm away, turned by up to max_turn_deg about a random axis
        board_in_cam = T(rng.uniform(-max_turn_deg, max_turn_deg, 3), [rng.uniform(-60, 60), rng.uniform(-40, 40), rng.uniform(420, 580)])
        flange_in_base = board_in_base @ np.linalg.inv(board_in_cam) @ np.linalg.inv(X_true)
        # what gets recorded: the robot is off by 0.05 mm, the camera's board pose by 0.1 mm and 0.02 degrees
        seen = T(rng.normal(0, 0.02, 3), rng.normal(0, 0.1, 3)) @ board_in_cam
        R_g2b.append(flange_in_base[:3, :3]); t_g2b.append(flange_in_base[:3, 3] + rng.normal(0, 0.05, 3))
        R_t2c.append(seen[:3, :3]); t_t2c.append(seen[:3, 3])
    R, t = cv2.calibrateHandEye(R_g2b, t_g2b, R_t2c, t_t2c, method=cv2.CALIB_HAND_EYE_PARK)
    X = np.eye(4); X[:3, :3] = R; X[:3, 3] = t.ravel()
    p = np.array([0, 0, 500, 1.0])                    # a point 500 mm in front of the camera
    return np.linalg.norm((X @ p - X_true @ p)[:3])

for turn in (3, 10, 30):
    errors = [calibrate(turn, np.random.default_rng(seed)) for seed in range(200)]
    print(f"poses turned up to {turn:2d} degrees: point 500 mm ahead is off by {np.median(errors):5.2f} mm (median of 200 runs), {np.percentile(errors, 90):5.2f} mm in the worst tenth")
