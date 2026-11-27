"""Writes the small files the guide's two scripts were run on: two lists of IMU timestamps (a steady 200 Hz stream, and the
same stream delivered in bursts of ten and stamped on arrival) and a camchain file holding the transform of the simulation."""
import numpy as np
from lab import R_CI_TRUE, P_CI_TRUE
rng = np.random.default_rng(1)
t = 1700000000 + np.arange(0, 60, 0.005) + rng.normal(0, 2e-5, 12000)
np.savetxt("/tmp/imu_stamps_steady.txt", t, fmt="%.6f")
np.savetxt("/tmp/imu_stamps_bursts.txt", t[np.minimum((np.arange(12000) // 10 + 1) * 10 - 1, 11999)], fmt="%.6f")
rows = np.eye(4); rows[:3, :3] = R_CI_TRUE; rows[:3, 3] = P_CI_TRUE
with open("/tmp/dynamic-camchain-imucam.yaml", "w") as f:
    f.write("cam0:\n  T_cam_imu:\n" + "".join("  - [%s]\n" % ", ".join("%.4f" % v for v in r) for r in rows) + "  timeshift_cam_imu: 0.0040\n  camera_model: pinhole\n")
