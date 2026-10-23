---
seoTitle: "AprilGrid pattern generator — free Kalibr-compatible PDF"
seoDescription: "Generate AprilGrid calibration patterns for Kalibr camera–IMU calibration. AprilTag 36h11 dictionary, print-exact PDF and YAML config. Free, in your browser."
h1: "AprilGrid pattern generator"
faq:
  - q: "What is an AprilGrid?"
    a: "An AprilGrid is a grid of AprilTag fiducial markers arranged in a regular pattern. It is the standard target for ETH ASL's Kalibr multi-camera and camera–IMU calibration tool."
  - q: "Which dictionary does Kalibr use?"
    a: "Kalibr uses AprilTag 36h11 (DICT_APRILTAG_36h11 in OpenCV). This is the only dictionary supported by the Kalibr target format."
  - q: "Can I use AprilGrid with OpenCV?"
    a: "Yes, via cv2.aruco with DICT_APRILTAG_36h11. However, ChArUco provides better sub-pixel accuracy for OpenCV-only workflows."
---

## What it does

Generate AprilGrid calibration targets compatible with ETH ASL's Kalibr calibration toolchain. AprilGrids use AprilTag 36h11 markers for robust detection and are the standard pattern for camera–IMU calibration in robotics.

## How to use it

Set pattern to **AprilGrid (Kalibr)**, configure rows, columns and tag size. The dictionary is locked to AprilTag 36h11. Download the PDF and the `kalibr.yaml` config file for direct use with the `kalibr_calibrate_cameras` command.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — when to choose AprilGrid
