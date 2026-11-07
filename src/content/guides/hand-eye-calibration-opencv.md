---
title: "Hand-eye calibration in OpenCV: step by step"
description: "Hand-eye calibration with OpenCV and Python: eye-in-hand and eye-to-hand, which robot poses to record, calibrateHandEye code, and how to check the result."
date: 2026-11-07
updated: 2026-11-07
readingTime: "14 min"
keyRule: "Rotate the robot a lot between poses, keep the frame conventions straight, and judge the result by a physical check, not by the solver residual alone."
related: ["opencv-camera-calibration", "charuco-vs-checkerboard-vs-aprilgrid", "multi-board-marker-ids"]
products: ["hand-eye-calibration-kit", "charuco-ceramic", "charuco-composite"]
sampleFiles: []
faq:
  - q: "How many robot poses do I need for hand-eye calibration?"
    a: "Two motions with non-parallel rotation axes is the mathematical minimum. In practice, 15 to 25 poses with large rotations around different axes give a stable result; more poses that only translate add little."
  - q: "Which calibrateHandEye method should I use?"
    a: "Run Park and Tsai and compare. They should agree to a fraction of a degree and a few millimetres; if they do not, the problem is the data, not the method. Daniilidis and Andreff can fail on some data sets and return NaN."
  - q: "Can I use calibrateHandEye for a fixed camera (eye-to-hand)?"
    a: "Yes. Mount the target on the gripper and pass the inverse robot pose (base-to-gripper) in place of gripper-to-base. The function then returns the camera pose in the robot base frame."
  - q: "Does cv2.calibrateHandEye exist in OpenCV 5?"
    a: "The C++ function is in OpenCV 5 (header opencv2/calib.hpp), but the Python wheels for 5.0 do not expose cv2.calibrateHandEye or cv2.calibrateRobotWorldHandEye. For Python, install opencv-contrib-python 4.x (4.1 or later)."
  - q: "What accuracy can I expect?"
    a: "With a calibrated camera, a rigid ChArUco target and 20 well-spread poses, rotation errors around 0.1° and translation errors of 1 to 3 mm at a working distance of about 0.5 m are typical. Robot repeatability and camera calibration set the floor."
---

Hand-eye calibration finds the fixed transform between a camera and a robot. Once you have it, anything the camera sees can be expressed in robot coordinates, and the robot can be sent to it.

This guide covers both arrangements with OpenCV and Python: what to record, how to call `cv2.calibrateHandEye`, and how to tell a good result from a bad one.

## The two arrangements

**Eye-in-hand** — the camera is mounted on the robot flange or gripper and the calibration target sits still in the cell. The unknown is the camera pose relative to the gripper, `T_cam2gripper`.

**Eye-to-hand** — the camera is fixed (on a stand or the ceiling) and the target is mounted on the gripper. The unknown is the camera pose relative to the robot base, `T_cam2base`.

Both are solved by the same function. The only difference is which robot transform you feed it, and what the result means.

## What the solver needs

For every robot pose you record two transforms:

- **Robot pose** `T_gripper2base` — where the flange is, read from the controller.

- **Target pose** `T_target2cam` — where the board is as seen by the camera, from `solvePnP` on the detected corners.

The camera must be calibrated first (intrinsics and distortion). Follow the [camera calibration guide](/guides/opencv-camera-calibration/) with the lens locked at its production focus; a poor intrinsic calibration shows up directly as hand-eye error.

## 1. Choose and mount the target

Use a **ChArUco** board. Hand-eye calibration wants steep tilts and views where the board runs off the image edge, and ChArUco still identifies every visible corner in those views. A plain checkerboard needs the whole board in every image, which fights against the pose diversity you want.

Size the board so it fills roughly half the frame at your working distance; the [FOV calculator](/tools/fov/) does this from your sensor, lens and distance. Each marker bit should cover at least 3 pixels so the IDs decode at the steepest tilt.

The board has to stay put. For eye-in-hand, clamp it to the table or fixture; for eye-to-hand, bolt it to the flange so it cannot shift between poses. A rigid board on a proper mount, such as the [hand-eye calibration kit](/targets/hand-eye-calibration-kit/) with its flange adapter, settles this.

Generate a test pattern with the free [ChArUco generator](/tools/generator/charuco/) if you want to try the workflow before buying a target, and glue the print to something flat.

## 2. Plan the robot poses

The solver works from the *motions* between poses, and it only sees rotation. Poses that differ by a translation alone carry no information. Plan for:

- **15 to 25 poses.** Two is the minimum; around 20 gives a stable average.

- **Large rotations around different axes.** Aim for 30° to 45° between poses, rotating about all three axes in turn. Two rotations about the same axis cannot determine the translation.

- **The board in view at every pose**, with the camera roughly 0.35 to 0.6 m away for a 200 mm board. Let the board touch or cross the image edges in some views.

- **Settle time.** Wait for the robot to stop before reading the pose and triggering the camera, and record both at the same instant.

If you teach the poses by hand, teach them once and save them. You will want to repeat the calibration after a crash or a camera swap.

## 3. Record the data

At each pose, save the image and the robot pose together. Most controllers report the flange pose as position plus orientation, in millimetres and either Euler angles or a quaternion. Convert to a 4 × 4 matrix, and settle the units first: everything in metres or everything in millimetres.

Euler angles are the usual source of trouble. Check the controller manual for the axis order and whether angles are intrinsic or extrinsic, then confirm with a known move: rotate about one joint and verify that the matrix you build rotates the same way.

```python
import json
import cv2
import numpy as np
from scipy.spatial.transform import Rotation

def pose_matrix(xyz_mm, rpy_deg, order="xyz"):
    """Controller pose -> 4x4 T_gripper2base in metres. Check `order` against your manual."""
    T = np.eye(4)
    T[:3, :3] = Rotation.from_euler(order, rpy_deg, degrees=True).as_matrix()
    T[:3, 3] = np.asarray(xyz_mm, float) / 1000.0
    return T
```

Save the pose next to the image as JSON, not in the file name. A file name silently loses sign and precision.

## 4. Find the target pose in each image

Set up the board exactly as printed and load the camera calibration:

```python
fs = cv2.FileStorage("camera.yaml", cv2.FILE_STORAGE_READ)
K = fs.getNode("K").mat()
dist = fs.getNode("dist").mat()
fs.release()

d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
board = cv2.aruco.CharucoBoard((10, 7), 0.025, 0.018, d)  # (cols, rows), square, marker, metres
detector = cv2.aruco.CharucoDetector(board)
```

Then for every image, detect the corners and solve the board pose. Skip views with too few corners rather than keeping a shaky pose:

```python
def target_pose(gray):
    corners, ids, _, _ = detector.detectBoard(gray)
    if ids is None or len(ids) < 6:
        return None
    obj, img = board.matchImagePoints(corners, ids)
    ok, rvec, tvec = cv2.solvePnP(obj, img, K, dist, flags=cv2.SOLVEPNP_IPPE)
    if not ok:
        return None
    R, _ = cv2.Rodrigues(rvec)
    return R, tvec.ravel()
```

Collect the four lists the solver takes, keeping the two sides aligned pose by pose:

```python
R_g2b, t_g2b, R_t2c, t_t2c = [], [], [], []
for rec in json.load(open("poses.json")):
    gray = cv2.imread(rec["image"], cv2.IMREAD_GRAYSCALE)
    pose = target_pose(gray)
    if pose is None:
        print("skipping", rec["image"])
        continue
    T = pose_matrix(rec["xyz_mm"], rec["rpy_deg"])
    R_g2b.append(T[:3, :3]); t_g2b.append(T[:3, 3])
    R_t2c.append(pose[0]);   t_t2c.append(pose[1])
print(len(R_g2b), "poses")
```

## 5. Eye-in-hand: camera on the robot

Pass the robot poses as recorded. The result is the camera in the gripper frame:

```python
R, t = cv2.calibrateHandEye(R_g2b, t_g2b, R_t2c, t_t2c,
                            method=cv2.CALIB_HAND_EYE_PARK)
T_cam2gripper = np.eye(4)
T_cam2gripper[:3, :3] = R
T_cam2gripper[:3, 3] = t.ravel()
print(T_cam2gripper)
```

A point seen by the camera is then mapped into the base frame with `T_gripper2base @ T_cam2gripper @ p_cam`, using the robot pose at the moment of the image.

## 6. Eye-to-hand: fixed camera, target on the robot

Here the fixed pair is camera and base, and the moving pair is target and gripper. The same equation applies if you swap the roles of base and gripper, so feed the **inverse** robot pose, base-to-gripper:

```python
R_b2g = [R.T for R in R_g2b]
t_b2g = [-R.T @ t for R, t in zip(R_g2b, t_g2b)]

R, t = cv2.calibrateHandEye(R_b2g, t_b2g, R_t2c, t_t2c,
                            method=cv2.CALIB_HAND_EYE_PARK)
T_cam2base = np.eye(4)
T_cam2base[:3, :3] = R
T_cam2base[:3, 3] = t.ravel()
```

Now a point seen by the camera maps straight into the base frame with `T_cam2base @ p_cam`, independent of the robot pose.

Both paths above were run on synthetic images rendered through the real ChArUco detector: with 15 poses, 40° tilts and a little encoder noise, the recovered transform was within 0.2° and 3 mm of the truth in both arrangements.

## 7. Check the result

The solver always returns a matrix. Three checks tell you whether to trust it.

**Compare methods.** Run `CALIB_HAND_EYE_PARK` and `CALIB_HAND_EYE_TSAI` on the same data. With good data they agree to about 0.1° and a couple of millimetres. If they disagree by centimetres, go back to the data: a pose with the wrong sign, a swapped Euler order, or units mixed between millimetres and metres.

**Check the target is fixed.** For eye-in-hand, the target pose in the base frame should be the same at every robot pose. Compute it for each pose and look at the spread:

```python
X = T_cam2gripper
spread = []
for Rg, tg, Rt, tt in zip(R_g2b, t_g2b, R_t2c, t_t2c):
    Tg = np.eye(4); Tg[:3, :3] = Rg; Tg[:3, 3] = tg
    Tt = np.eye(4); Tt[:3, :3] = Rt; Tt[:3, 3] = tt
    spread.append((Tg @ X @ Tt)[:3, 3])
spread = np.array(spread)
dev = np.linalg.norm(spread - spread.mean(axis=0), axis=1) * 1000
print("target position spread, mm: mean %.2f max %.2f" % (dev.mean(), dev.max()))
```

For eye-to-hand, use `inv(Tg) @ T_cam2base @ Tt` instead; the target should be fixed in the gripper frame. One pose with a much larger deviation than the rest is a bad reading; drop it and solve again.

This residual is a consistency check, not an accuracy figure. In the synthetic test above the spread was about 1 mm while the true error was 3 mm, so a small spread does not by itself prove a small error.

**Touch a known point.** The test that counts is physical. Put a marker or a sharp feature in view, locate it with the camera, transform it into base coordinates, and jog the robot tool there. The gap you see is your real accuracy, and it includes robot and camera errors the solver cannot see.

## 8. Save and use the calibration

Store the result with the camera intrinsics it was computed with, and the date. A hand-eye calibration is only valid for that camera, that lens setting and that mounting.

```python
fs = cv2.FileStorage("hand_eye.yaml", cv2.FILE_STORAGE_WRITE)
fs.write("T_cam2gripper", T_cam2gripper)   # or T_cam2base
fs.write("K", K)
fs.write("dist", dist)
fs.release()
```

Repeat the calibration after any change to the camera mount, lens focus or robot tool definition, and after a collision.

## Software versions

`calibrateHandEye` arrived in OpenCV 4.1. The ChArUco code above uses the `CharucoDetector` API from OpenCV 4.7 onward.

In OpenCV 5.0 the C++ function moved to `opencv2/calib.hpp`, but the 5.0 Python wheels do not expose `cv2.calibrateHandEye` or `cv2.calibrateRobotWorldHandEye`; only the `CALIB_HAND_EYE_*` constants are present. For Python, pin `opencv-contrib-python<5` until the binding returns.

HALCON users have the same workflow in `calibrate_hand_eye` with a point-based calibration object, and ROS users can wrap the same OpenCV call through MoveIt's hand-eye calibration tools or `easy_handeye`.

## Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| Methods disagree by centimetres | Wrong Euler order, sign or units in the robot pose | Build one pose by hand from a known move and compare |
| Translation off, rotation fine | Robot pose and image not taken at the same instant | Wait for the robot to settle; trigger both together |
| Result changes a lot when one pose is dropped | Too few distinct rotations | Add poses rotated about other axes |
| `NaN` in the result | Andreff or Daniilidis on an ill-conditioned set | Use Park or Tsai; check the motions are not all about one axis |
| Good residual, poor touch test | Camera intrinsics stale or target not rigid | Recalibrate the camera; fix the board to its mount |
| Eye-to-hand result looks like the gripper pose | Robot pose not inverted | Pass base-to-gripper (see step 6) |

## Next steps

- [Calibrate the camera](/guides/opencv-camera-calibration/) before the hand-eye run, and keep the two calibrations together.

- [Choose a pattern](/guides/charuco-vs-checkerboard-vs-aprilgrid/) if the cell also needs stereo or camera–IMU calibration.

- For a cell with several cameras, [give each board its own marker IDs](/guides/multi-board-marker-ids/).
