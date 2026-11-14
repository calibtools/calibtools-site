---
title: "ChArUco vs checkerboard vs AprilGrid"
description: "Three patterns cover almost every calibration job. Which one depends on board visibility, lens width, and your software."
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

