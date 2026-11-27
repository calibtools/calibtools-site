"""Kalibr writes T_cam_imu; most VIO frameworks want the camera pose in the IMU frame, its inverse.
Usage: python invert.py dynamic-camchain-imucam.yaml"""
import sys
import numpy as np, yaml

chain = yaml.safe_load(open(sys.argv[1]))
T_cam_imu = np.array(chain["cam0"]["T_cam_imu"])
T_imu_cam = np.linalg.inv(T_cam_imu)
np.set_printoptions(precision=4, suppress=True)
print("camera in IMU frame:\n", T_imu_cam)
print("time offset (s):", chain["cam0"]["timeshift_cam_imu"])
