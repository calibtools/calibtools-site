---
title: "ChArUco vs checkerboard vs AprilGrid"
description: "Checkerboard, ChArUco, AprilGrid and circle grids compared: partial views, wide lenses, odd and even counts, square size and which software reads each."
date: 2026-10-22
updated: 2026-11-15
readingTime: "8 min"
related: ["corner-detection-troubleshooting", "calibration-target-size", "opencv-camera-calibration"]
products: ["charuco-composite", "checkerboard-composite", "aprilgrid-composite", "circlegrid-composite"]
sampleFiles: []
---

## The short answer

| Pattern | Best for | Avoid when |
|---|---|---|
| [Checkerboard](/targets/checkerboard-composite/) | Single camera, full board always in view, highest corner accuracy | Board gets cut off at the image edge; multi-camera rigs |
| [ChArUco](/targets/charuco-composite/) | Stereo and multi-camera, wide lenses, partial views; OpenCV native | Very low resolution where markers can't be decoded |
| [AprilGrid](/targets/aprilgrid-composite/) | Camera–IMU calibration with Kalibr; robotics stacks built on AprilTag | Pure OpenCV pipelines (less tooling than ChArUco) |

## Try each one on paper first

Print a page of each and point your camera at it before you buy a board. Every generator writes a PDF at 1:1 in millimeters:

- [Checkerboard generator](/tools/generator/checkerboard/), or the ready-made [7 × 10, 20 mm A4 PDF](/files/patterns/checkerboard-7x10-20mm-a4.pdf)
- [ChArUco generator](/tools/generator/charuco/), or the ready-made [7 × 10, 20 mm A4 PDF](/files/patterns/charuco-7x10-20mm-6x6-250-a4.pdf)
- [AprilGrid generator](/tools/generator/aprilgrid/), or the ready-made [6 × 6, 20 mm A4 PDF](/files/patterns/aprilgrid-6x6-20mm-a4.pdf)

Print at 100 % ("actual size") and measure one square before you enter its size in your code.

## Why partial views matter more than you think

Lens distortion is strongest in the corners of the image, and that is exactly where a plain checkerboard can't be used — the detector needs every inner corner visible. Coded patterns let you push the board right to the edge, which is where the distortion model actually gets constrained.

![Three boards with 45 % of their width outside the camera frame and the points OpenCV still returns: none on the checkerboard, 24 of 54 inner corners on the ChArUco board, 60 of 140 tag corners on the AprilGrid.](../../assets/guides/partial-view-detection.svg)

The figure is a measurement, not a sketch. Each board was rendered with 45 % of its width outside the image and passed to OpenCV 5.0.

`findChessboardCorners`, given the board's full size, returns nothing. `CharucoDetector` returns 24 of the 54 inner corners, each with its ID. The AprilTag detector returns every tag that is completely in view: 15 tags, 60 corners.


## Picking square and marker size

Start from the field of view. The board should cover about half of the image at your working distance; the [target size guide](/calibacademy/calibration-target-size/) and the [FOV calculator](/tools/fov/) work out the board size for your camera and lens.

Then check the smallest feature in pixels:

- **Checkerboard**: a square should span at least 10 to 15 px at the far end of your working range, so the corner detector has edges to work with.
- **ChArUco and AprilGrid**: the marker decides. A DICT_6X6 marker is 8 cells across with its border, a tag36h11 tag 8 cells with a one-cell border (10 with Kalibr's two-cell border). Each cell needs about 3 to 5 px to decode reliably.
- **Marker to square ratio**: 0.7 to 0.75 on ChArUco. Smaller markers leave more white around them for the corner detector; larger ones decode from farther away.

More squares give more points per image, but smaller squares fail first when the board is far, tilted or out of focus. Pick the largest square that still gives you at least 6 × 9 inner corners on the board.

## Odd and even counts: avoid a board that looks the same upside down

A checkerboard with an even number of squares in both directions looks identical after a 180° turn. The detector then cannot tell which corner is the origin, and stereo or multi-camera calibration gets corners matched the wrong way round between views.

Use one odd and one even count, such as 7 × 10 squares (6 × 9 inner corners). ChArUco and AprilGrid do not have this problem: every marker carries its own ID.

## Circle grids

Circle grids are the fourth common pattern. The detector fits each dot, so every edge pixel contributes and the centers are less noisy than corners in a blurry image.

- **Symmetric grid**: looks the same after a 180° turn, like an even checkerboard. Fine for a single camera, ambiguous for stereo.
- **Asymmetric grid**: every other row shifted by half a pitch. Its orientation is unique, so it is the one to use for stereo.
- **Bias**: a tilted circle images as an ellipse, and the center of that ellipse is not exactly the image of the circle's center. The error grows with dot size and tilt. Keep dots small relative to the field of view and avoid steep angles.

OpenCV finds them with `findCirclesGrid`. The [circle grid generator](/tools/generator/circles/) draws both kinds.

## Which software reads which pattern

| Pattern | OpenCV | Kalibr | ROS 2 camera_calibration |
|---|---|---|---|
| Checkerboard | Yes | Yes | Yes |
| ChArUco | Yes | No | Yes |
| AprilGrid | Tags only, no board class | Yes | No |
| Circle grid | Yes | Yes | Yes |

If your pipeline is OpenCV, ChArUco is the safe default. For camera–IMU work in Kalibr, AprilGrid. For the highest corner accuracy with the whole board always in view, a plain checkerboard.
