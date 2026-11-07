---
title: "Drone, VIO and SLAM calibration"
seoTitle: "Drone, VIO and SLAM calibration targets"
seoDescription: "AprilGrid and ChArUco targets for drone, VIO and SLAM calibration: camera–IMU with Kalibr, multi-camera and thermal cameras. Rigid, so the grid stays square."
code: "UAV"
order: 5
audience: "For drone makers and VIO / SLAM algorithm teams."
summary: "VIO and SLAM need accurate camera intrinsics and camera–IMU extrinsics. Kalibr with an AprilGrid is the usual way to get both."
products:
  - "aprilgrid-composite"
  - "charuco-composite"
  - "thermal-calibration-target"
  - "multi-camera-target"
links:
  - { label: "Kalibr camera–IMU calibration", href: "/guides/kalibr-camera-imu-calibration/" }
  - { label: "AprilGrid generator", href: "/tools/generator/aprilgrid/" }
  - { label: "AprilTag generator", href: "/tools/generator/apriltag/" }
  - { label: "FOV calculator", href: "/tools/fov/" }
  - { label: "Camera calibration with OpenCV", href: "/guides/opencv-camera-calibration/" }
selection:
  - { scenario: "Camera–IMU with Kalibr", pattern: "AprilGrid 36h11", size: "400 × 300 to 600 × 400 mm", material: "Aluminum composite" }
  - { scenario: "Fisheye or wide stereo", pattern: "AprilGrid or ChArUco", size: "600 × 400 mm", material: "Aluminum composite" }
  - { scenario: "Thermal camera on the drone", pattern: "Heated checkerboard or circles", size: "Built to size", material: "Heated panel" }
  - { scenario: "Small indoor drones", pattern: "AprilGrid", size: "200 × 150 to 300 × 200 mm", material: "Aluminum composite" }
faq:
  - { q: "Why does Kalibr fail with my printed AprilGrid?", a: "A common cause is a print that is not exactly to scale or not flat, so tagSize and tagSpacing no longer match the grid. Measure the printed tag, or use a rigid board made to the stated size." }
  - { q: "Which tag spacing should I use?", a: "Kalibr expresses spacing as a ratio of the tag size; 0.3 is a common choice and what our AprilGrid boards use." }
  - { q: "Can I calibrate a thermal camera with Kalibr?", a: "Yes, with a target the thermal camera can see, such as a heated checkerboard or circle grid. A printed board is blank in LWIR." }
---

## What you calibrate

- **Camera intrinsics**, often fisheye.

- **Camera–IMU extrinsics and time offset** with Kalibr.

- **Multi-camera** and **thermal camera** extrinsics on the same airframe.

## Common problems

VIO that drifts or diverges is often traced back to a missing or poor camera–IMU calibration. Kalibr needs a target whose real size matches its YAML exactly: a print that is slightly scaled, not square or not flat breaks that assumption.

Our AprilGrid boards are rigid and made to the stated tag size and spacing, and the generator writes the matching Kalibr YAML. For thermal payloads, use a heated target; printed patterns do not show up in LWIR.
