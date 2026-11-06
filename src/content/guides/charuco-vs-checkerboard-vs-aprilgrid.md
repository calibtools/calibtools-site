---
title: "ChArUco vs checkerboard vs AprilGrid"
description: "Three patterns cover almost every calibration job. Which one depends on board visibility, lens width, and your software."
date: 2026-10-22
updated: 2026-10-22
readingTime: "8 min"
related: []
products: ["charuco-composite", "checkerboard-composite", "aprilgrid-composite", "circlegrid-composite"]
sampleFiles: []
---

## The short answer

| Pattern | Best for | Avoid when |
|---|---|---|
| [Checkerboard](/targets/checkerboard-composite/) | Single camera, full board always in view, highest corner accuracy | Board gets cut off at the image edge; multi-camera rigs |
| [ChArUco](/targets/charuco-composite/) | Stereo and multi-camera, wide lenses, partial views; OpenCV native | Very low resolution where markers can't be decoded |
| [AprilGrid](/targets/aprilgrid-composite/) | Camera–IMU calibration with Kalibr; robotics stacks built on AprilTag | Pure OpenCV pipelines (less tooling than ChArUco) |

## Why partial views matter more than you think

Lens distortion is strongest in the corners of the image, and that is exactly where a plain checkerboard can't be used — the detector needs every inner corner visible. Coded patterns let you push the board right to the edge, which is where the distortion model actually gets constrained.


## Picking square and marker size

