---
seoTitle: "Hand-eye calibration kit, ChArUco"
seoDescription: "A ChArUco target with a robot flange adapter for eye-in-hand and eye-to-hand calibration. Detects with partial views, so poses near the image edge still count."
summary: "ChArUco target and flange adapter for your robot hand-eye calibration"
decideSpecs:
  - "Target"
  - "Mount"
  - "Use"
chips:
  - "ChArUco, ceramic"
  - "ISO 9409-1-50 flange"
  - "Eye-in-hand / eye-to-hand"
story: "Hand-eye calibration works best with many robot poses at steep angles, and with those poses the board is often partly out of view. A ChArUco target still gives you identified corners when only part of it is visible, so every pose can count.\n\nThe kit pairs a ChArUco target with an adapter for an ISO 50 robot flange, so you can mount the target on the robot (eye-to-hand) or use it as a fixed reference while the camera rides on the arm (eye-in-hand). We confirm the target size and flange pattern for your robot. The specifications shown are target values — tell us your robot and camera and we will confirm what we can deliver, and when."
compat:
  - { tool: "OpenCV", note: "cv.calibrateHandEye with CharucoDetector poses" }
  - { tool: "ROS / MoveIt", note: "MoveIt hand-eye calibration with a ChArUco target" }
  - { tool: "HALCON", note: "Corner point tuple with calibrate_hand_eye" }
---
