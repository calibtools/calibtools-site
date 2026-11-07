---
title: "Kalibr camera–IMU calibration: step by step"
description: "Camera–IMU calibration with Kalibr: AprilGrid and IMU noise files, recording the sequence, running the calibration, and reading T_cam_imu and the time offset."
date: 2026-11-07
updated: 2026-11-07
readingTime: "13 min"
keyRule: "Calibrate the camera on a static sequence first, then move the sensor, not the board, and judge the result by the report plots rather than by the fact that it converged."
related: ["opencv-camera-calibration", "charuco-vs-checkerboard-vs-aprilgrid", "hand-eye-calibration-opencv"]
products: ["aprilgrid-composite", "charuco-composite"]
sampleFiles: []
faq:
  - q: "Which target does Kalibr want for camera–IMU calibration?"
    a: "An AprilGrid. Every tag has its own ID, so the board can leave the frame or be partly covered during fast motion and the pose is still unambiguous. Checkerboards and circle grids work but can flip the pose estimate at some angles."
  - q: "What is T_cam_imu?"
    a: "The transform from IMU coordinates to camera coordinates: p_cam = T_cam_imu · p_imu. Most VIO frameworks want the camera-in-IMU transform instead, which is its inverse."
  - q: "What does timeshift_cam_imu mean?"
    a: "The time offset in seconds between the two clocks, defined so that t_imu = t_cam + timeshift_cam_imu. A few milliseconds is common on USB cameras; it is estimated by default."
  - q: "Where do the IMU noise values come from?"
    a: "From an Allan deviation analysis of a long static recording, or from the datasheet converted to Kalibr's continuous-time units. Low-cost MEMS IMUs usually need the values inflated several times over the datasheet."
  - q: "Does Kalibr work with ROS 2?"
    a: "Kalibr runs on ROS 1 and reads ROS 1 bags. The repository ships Docker images, and ROS 2 recordings can be converted to the ROS 1 bag format with the rosbags Python package before calibration."
---

Kalibr's camera–IMU calibration gives you the rigid transform between a camera and an inertial unit and the time offset between their clocks. Visual-inertial odometry (VINS, OpenVINS, ORB-SLAM3, Basalt) cannot run well without both.

This guide walks through the inputs, the recording, the run and the checks, with the exact file formats Kalibr expects.

## What you need

- A camera and IMU rigidly mounted together, time-stamped from one clock.

- An **AprilGrid** target. ChArUco and checkerboards work for the camera-only step, but the camera–IMU step is built around the AprilGrid.

- Kalibr, which runs on ROS 1. The repository provides Dockerfiles that bundle ROS, so you do not need a native ROS install.

- Noise parameters for your IMU (step 2).

## 1. Set up the target file

Kalibr reads the grid from a small YAML file. `tagSize` is the black outer edge of one tag in metres and `tagSpacing` is the gap between tags as a fraction of the tag size:

```yaml
target_type: 'aprilgrid'
tagCols: 6
tagRows: 6
tagSize: 0.030        # metres, outer edge of the black square
tagSpacing: 0.3       # gap / tagSize
```

The [AprilGrid generator](/tools/generator/aprilgrid/) writes this file for whatever grid you print, and the [AprilGrid board](/targets/aprilgrid-composite/) ships to a stated tag size so the file matches the physical board.

Tag size matters more than anything else in this file. A 1 % error in `tagSize` is a 1 % error in every distance Kalibr estimates. Measure a printed board with callipers across several tags and divide.

## 2. Write the IMU noise file

The IMU file carries the topic, the rate and four noise parameters, all in continuous-time units:

```yaml
rostopic: /imu0
update_rate: 200.0                  # Hz

accelerometer_noise_density: 1.86e-03   # m/s²/√Hz
accelerometer_random_walk:   4.33e-04   # m/s³/√Hz
gyroscope_noise_density:     1.87e-04   # rad/s/√Hz
gyroscope_random_walk:       2.66e-05   # rad/s²/√Hz
```

Two ways to fill these in:

**From the datasheet.** Noise density is usually given as µg/√Hz or °/s/√Hz; convert to m/s²/√Hz and rad/s/√Hz. Random walk is listed as velocity random walk (m/s/√h) and angular random walk (°/√h); convert the time unit to seconds.

**From an Allan deviation plot.** Record the IMU stationary for a few hours, then run `allan_variance_ros` or a similar tool. White noise is read at τ = 1 s on the −½ slope, random walk at τ = 3 s on the +½ slope. This also catches sensors whose datasheet is optimistic.

Inflate the numbers for consumer MEMS parts. Kalibr's model ignores scale error and temperature drift, and its authors suggest a factor of ten or more for the cheapest sensors. Too-large noise loosens the solve a little; too-small noise makes it over-confident and likely to diverge.

## 3. Calibrate the camera first

Record a **static-sensor** sequence: the camera held steady or moved slowly, the grid moved through the frame at many angles and distances. Keep the whole grid visible for most of it. Around a minute at 4 Hz is plenty; a higher rate only adds near-duplicate frames.

```bash
rosbag record -O static.bag /cam0/image_raw

rosrun kalibr kalibr_calibrate_cameras \
  --bag static.bag --topics /cam0/image_raw \
  --models pinhole-radtan --target aprilgrid.yaml
```

Use `pinhole-equi` for fisheye lenses and `omni-radtan` for very wide fields of view. The run writes `camchain-static.yaml` with the intrinsics, which feeds the next step.

Check the reprojection error in the report: 0.1 to 0.3 px is normal for a good lens and a rigid board. Above about 0.5 px, fix the camera calibration before going on; the IMU step inherits every pixel of error.

## 4. Record the dynamic sequence

Now the target stays still and the sensor moves. This is the recording the result depends on, so set it up with care:

- **Rates.** 20 Hz images and 200 Hz IMU are what Kalibr's authors recommend. Faster cameras add frames without adding information.

- **Exposure.** Short shutter times so the tags stay sharp during motion. Add light rather than exposure.

- **Motion.** Excite all three gyro axes and all three accelerometer axes: rotate about each axis in turn and translate along each axis, with the grid in view throughout. Smooth, continuous movements over 60 to 120 s are better than jerky ones.

- **No shocks.** Start recording with the sensor already in hand and the grid in view; stop before you put it down. Picking the rig up produces accelerations that the model cannot fit.

- **Timestamps.** Both streams must be stamped by the same clock with low jitter. Driver-side stamps from a USB camera are often fine; stamps assigned on arrival in ROS are not.

```bash
rosbag record -O dynamic.bag /cam0/image_raw /imu0
```

Before running the calibration, look at the IMU timestamp gaps. Bursts of samples followed by gaps mean the driver is batching, and Kalibr will fail or give a wrong time offset:

```python
import numpy as np

t = np.loadtxt("imu_stamps.txt")          # one timestamp per line, seconds
dt = np.diff(t) * 1000
print("IMU dt ms: median %.2f  min %.2f  max %.2f" % (np.median(dt), dt.min(), dt.max()))
print("gaps > 2x nominal:", int((dt > 2 * np.median(dt)).sum()))
```

Export the stamps with `rostopic echo -b dynamic.bag -p /imu0 | cut -d, -f1` or from a ROS 2 bag with the `rosbags` package. A healthy 200 Hz stream shows a median of 5 ms and no gaps.

## 5. Run the calibration

```bash
rosrun kalibr kalibr_calibrate_imu_camera \
  --bag dynamic.bag \
  --cam camchain-static.yaml \
  --imu imu.yaml \
  --target aprilgrid.yaml
```

Time offset estimation is on by default; add `--no-time-calibration` only if the clocks are hardware-synchronised and you want to lock the offset to zero. Use `--bag-from-to 5 110` to trim the pick-up and put-down seconds if they made it into the bag.

The run takes a few minutes and writes three files next to the bag:

- `camchain-imucam-dynamic.yaml` — the camera chain with `T_cam_imu` and `timeshift_cam_imu` added per camera.

- `results-imucam-dynamic.txt` — the numbers in plain text.

- `report-imucam-dynamic.pdf` — plots to inspect before you trust anything.

## 6. Read the result

In the output YAML, `T_cam_imu` maps IMU coordinates into camera coordinates, and the time shift is defined so that `t_imu = t_cam + timeshift_cam_imu`:

```yaml
cam0:
  T_cam_imu:
  - [0.0148, 0.9998, 0.0121, -0.0215]
  - [-0.9999, 0.0148, 0.0027, -0.0647]
  - [0.0025, -0.0122, 0.9999, 0.0096]
  - [0.0, 0.0, 0.0, 1.0]
  timeshift_cam_imu: 0.0034
  camera_model: pinhole
  ...
```

Open the report and check, in this order:

1. **Reprojection error plot.** Should look like the camera-only result, a tight cloud under about 0.5 px with no drift over time.

2. **Predicted vs measured angular velocity and acceleration.** The predicted curves (from the camera trajectory) should sit on top of the IMU measurements. A constant offset is a bias the model absorbs; a lag between the curves means the time offset is wrong or the stamps are bad.

3. **Gyroscope and accelerometer error plots.** Errors should look like noise around zero. Bursts at the start or end are shocks; trim them with `--bag-from-to` and rerun.

4. **The time offset.** A few milliseconds is normal on USB cameras. Tens of milliseconds, or a value that changes a lot between two recordings, points at the timestamp problem from step 4.

Run the calibration twice on two separate recordings. If the two `T_cam_imu` results agree within a few millimetres and a few tenths of a degree, you have a usable calibration. If they do not, the recording, not the solver, is what to improve.

## 7. Use it in your VIO stack

Most frameworks want the **camera pose in the IMU frame**, which is the inverse of what Kalibr writes:

```python
import numpy as np, yaml

chain = yaml.safe_load(open("camchain-imucam-dynamic.yaml"))
T_cam_imu = np.array(chain["cam0"]["T_cam_imu"])
T_imu_cam = np.linalg.inv(T_cam_imu)
print("camera in IMU frame:\n", T_imu_cam)
print("time offset (s):", chain["cam0"]["timeshift_cam_imu"])
```

Check the convention of the target before pasting: OpenVINS (`T_imu_cam`) and VINS-Fusion (`body_T_cam0`) take the camera-in-IMU form, and each documents how it defines the time offset. Mixing up the direction produces a system that tracks for a few seconds and then drifts.

Repeat the calibration after any change to the mount, lens focus or driver, and after a drop.

## Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| Optimisation diverges or produces NaN | IMU noise values far too small, or a shock in the data | Inflate the noise parameters; trim start and end with `--bag-from-to` |
| Large time offset, differs between runs | Timestamps assigned on arrival, or batched IMU samples | Use driver timestamps from one clock; check the dt histogram |
| Predicted and measured curves lag | Wrong time offset, or `--no-time-calibration` with unsynchronised clocks | Enable time calibration |
| Rotation fine, translation uncertain | Not enough translation, or translation without rotation | Add moves that combine rotation and translation along all axes |
| Few target detections | Motion blur, dim light, grid too small in the frame | Shorter exposure, more light, move closer or use a larger grid |
| Pose flips during the sequence | Symmetric target (checkerboard or circle grid) | Use an AprilGrid |
| Result works in Kalibr, drifts in VIO | Transform direction or time-offset sign mismatched | Invert `T_cam_imu` and check the framework's convention |

## Next steps

- [Calibrate the camera with OpenCV](/guides/opencv-camera-calibration/) if you want to check Kalibr's intrinsics against an independent tool.

- [Choose a pattern](/guides/charuco-vs-checkerboard-vs-aprilgrid/) when the same rig also needs stereo or hand-eye calibration.

- Robot-mounted sensors also need [hand-eye calibration](/guides/hand-eye-calibration-opencv/) to tie the IMU frame to the robot.
