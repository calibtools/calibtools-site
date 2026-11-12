---
seoTitle: "AprilGrid generator — Kalibr PDF"
seoDescription: "Generate AprilGrid calibration patterns for Kalibr camera–IMU calibration. AprilTag 36h11 dictionary, print-exact PDF and YAML config. Free, in your browser."
h1: "AprilGrid pattern generator"
faq:
  - q: "What is an AprilGrid?"
    a: "An AprilGrid is a grid of AprilTag fiducial markers arranged in a regular pattern. It is the standard target for ETH ASL's Kalibr multi-camera and camera–IMU calibration tool."
  - q: "Which dictionary does Kalibr use?"
    a: "Kalibr uses AprilTag 36h11 (DICT_APRILTAG_36h11 in OpenCV). This is the only dictionary supported by the Kalibr target format."
  - q: "Can I use AprilGrid with OpenCV?"
    a: "Yes, via cv2.aruco with DICT_APRILTAG_36h11 and markerBorderBits set to 2, because Kalibr tags have a two-cell border. However, ChArUco provides better sub-pixel accuracy for OpenCV-only workflows."
  - q: "What do tagSize and tagSpacing mean in the Kalibr YAML?"
    a: "tagSize is the edge of one tag in meters. tagSpacing is the gap between tags divided by the tag size, so 0.3 with 20 mm tags means a 6 mm gap. The kalibr.yaml file from the generator contains both for the grid you printed."
  - q: "Where is tag 0?"
    a: "At the bottom left, as Kalibr prints it. IDs run left to right along the bottom row and then upward."
  - q: "Can I use the pattern commercially?"
    a: "Yes. Patterns you generate here are free to use for any purpose, including commercial products and client work. No sign-up and no attribution needed."
---

## What it does

Generate AprilGrid calibration targets compatible with ETH ASL's Kalibr calibration toolchain. AprilGrids use AprilTag 36h11 markers for robust detection and are the standard pattern for camera–IMU calibration in robotics.

## How to use it

1. **Rows and columns**: the number of tags. The page opens with Kalibr's usual 6 × 6 grid of 20 mm tags, which fits one A4 or Letter page.

2. **Tag size**: the edge of one tag in millimeters. The gap between tags is 0.3 of the tag size unless you change it.

3. **Download** the PDF and print at 100 % (no "fit to page"). Check the 100 mm scale bar with a ruler, then measure one tag and put the measured size into the YAML.

4. **Download `kalibr.yaml`** and pass it to `kalibr_calibrate_cameras` with `--target`.

## Ready-made grids

Each link opens the generator with the grid filled in.

- [6 × 6 tags, 20 mm: one A4 or Letter page](/tools/generator/aprilgrid/?rows=6&cols=6&square=20)
- [6 × 6 tags, 26 mm: one A3 or Tabloid page](/tools/generator/aprilgrid/?rows=6&cols=6&square=26&paper=A3)
- [4 × 6 tags, 25 mm: one A4 or Letter page](/tools/generator/aprilgrid/?rows=4&cols=6&square=25)

The page keeps a white margin of one tag around the pattern, because the detector needs it.

## The Kalibr target file

For the 6 × 6 grid of 20 mm tags:

```yaml
target_type: 'aprilgrid'
tagRows: 6
tagCols: 6
tagSize: 0.02
tagSpacing: 0.3
```

Tag 0 is at the bottom left and the tags are drawn as Kalibr draws them, so the detected corner order matches. The [Kalibr camera–IMU guide](/guides/kalibr-camera-imu-calibration/) walks through the whole calibration.

## Free for commercial use

Patterns from this generator are free to use for any purpose: internal, educational or commercial. No sign-up and no attribution needed.

## Paper or a rigid board?

Camera–IMU calibration means moving the camera or the target quickly, and a sheet of paper flexes. The [AprilGrid on aluminum composite](/targets/aprilgrid-composite/) stays flat and is measured before it ships.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — when to choose AprilGrid
- [Kalibr camera–IMU calibration](/guides/kalibr-camera-imu-calibration/) — from recording to result
- Single tags for localization? Use the [AprilTag generator](/tools/generator/apriltag/).
