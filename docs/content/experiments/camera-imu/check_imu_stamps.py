"""Look at the gaps between IMU timestamps before calibrating. Usage: python check_imu_stamps.py imu_stamps.txt"""
import sys
import numpy as np

t = np.loadtxt(sys.argv[1])               # one timestamp per line, seconds
dt = np.diff(t) * 1000
print("IMU dt ms: median %.2f  min %.2f  max %.2f" % (np.median(dt), dt.min(), dt.max()))
print("gaps > 2x nominal:", int((dt > 2 * np.median(dt)).sum()), "of", len(dt))
print("samples with the same stamp as the one before:", int((dt == 0).sum()))
