---
title: "Robotics calibration: hand-eye and multi-camera"
seoTitle: "Robotics calibration targets: hand-eye"
seoDescription: "Calibration targets for robotics R&D: ChArUco boards for hand-eye calibration, AprilGrid for camera–IMU, multi-face targets for multi-camera rigs."
code: "ROB-RD"
order: 3
audience: "For robotics research teams, humanoid and mobile-robot developers and university robotics labs."
summary: "Robots move cameras through steep, varied poses. The target has to stay identified when only part of it is in view."
products:
  - "hand-eye-calibration-kit"
  - "charuco-composite"
  - "charuco-ceramic"
  - "aprilgrid-composite"
  - "multi-camera-target"
  - "mounting-fixture"
links:
  - { label: "Camera calibration with OpenCV", href: "/guides/opencv-camera-calibration/" }
  - { label: "Hand-eye calibration in OpenCV", href: "/guides/hand-eye-calibration-opencv/" }
  - { label: "Kalibr camera–IMU calibration", href: "/guides/kalibr-camera-imu-calibration/" }
  - { label: "ArUco marker generator", href: "/tools/generator/aruco/" }
  - { label: "AprilTag generator", href: "/tools/generator/apriltag/" }
  - { label: "Multiple boards in one rig", href: "/guides/multi-board-marker-ids/" }
  - { label: "Board not detected? Troubleshooting", href: "/guides/corner-detection-troubleshooting/" }
selection:
  - { scenario: "Hand-eye, camera on the arm", pattern: "ChArUco, fixed in the cell", size: "200 × 150 to 400 × 300 mm", material: "Ceramic or composite" }
  - { scenario: "Hand-eye, board on the flange", pattern: "ChArUco with flange adapter", size: "200 × 150 to 300 × 200 mm", material: "Ceramic (light, stable)" }
  - { scenario: "Camera–IMU (Kalibr)", pattern: "AprilGrid 36h11", size: "400 × 300 to 600 × 400 mm", material: "Aluminum composite" }
  - { scenario: "Multi-camera rig", pattern: "Multi-face ChArUco", size: "300 mm faces", material: "Composite" }
faq:
  - { q: "My reprojection error is tiny but the robot still misses by millimeters. Is it the board?", a: "Usually not. Hand-eye accuracy depends on the robot’s own accuracy and on how varied your poses are. Use more poses with large rotations; a rigid, measured board removes the target as a source of error." }
  - { q: "Which OpenCV version matches your ChArUco boards?", a: "Our boards follow the OpenCV 4.6 and later layout. If your code uses the older layout, set setLegacyPattern(True) or order the legacy layout." }
  - { q: "Where should the board go for eye-to-hand?", a: "On the robot flange or tool, inside the fixed camera’s field of view, mounted rigidly so it cannot move relative to the flange." }
---

## What you calibrate

- **Hand-eye transforms**, eye-in-hand or eye-to-hand.

- **Camera–IMU extrinsics and time offset** for mobile robots, usually with Kalibr.

- **Multi-camera rigs**, where cameras look at the robot or workspace from several sides.

## Common problems

Hand-eye results are often limited by the robot and the poses rather than the board: too few poses, too little rotation, or a board that shifts on its mount. A ChArUco board helps because steep poses that cut off part of the board still give identified corners.

Another frequent trap is a ChArUco board made with a different OpenCV layout than your code expects. Our boards follow the OpenCV 4.6+ layout and the generator offers the legacy layout if you need it.
