---
summary: "AprilGrid composite board for Kalibr camera–IMU calibration"
decideSpecs:
  - "Feature position tolerance"
  - "Substrate"
  - "Flatness"
chips:
  - "±0.3 mm + 0.2 mm/m"
  - "6 mm"
  - "200–800 mm"
story: "AprilGrid is the standard target for the Kalibr camera–IMU calibration toolchain. Each cell contains an AprilTag 36h11 marker, giving every grid point a unique ID so the board can be detected at any orientation and under partial occlusion.\n\nThe grid layout provides dense, evenly distributed feature coverage across the image plane, which is essential for accurate intrinsic and extrinsic estimation in multi-camera and camera–IMU setups."
---
