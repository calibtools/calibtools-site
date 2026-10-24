---
code: CT-UM-CHT-P
title: Checkerboard composite target — Quick start
type: manual
rev: A
date: 2026-10-24
status: draft
family: CHT
material: P
---

## 1. Know your inner-corner count

Detectors want inner corners, not squares. A 7 × 10 board has **6 × 9** inner corners. The edge strip and the JSON give both; ROS `--size` and OpenCV `patternSize` take inner corners.

## 2. The one rule

**The entire board must be visible in every image**, with a white margin around it. If any corner is cut off, the detector fails or — worse — mis-assigns corners silently. If you need edge-of-image coverage, use a ChArUco target instead.

## 3. Capture checklist

- 15–25 images; board filling 30–70 % of the frame.
- Tilt ±30–45° both axes; move the board to all regions of the image across the set (centre, edges, corners) while keeping it fully visible.
- Vary distance 2×. Keep focus sharp.
- Avoid glare: matte print tolerates most lighting, but a light behind the camera reflecting off a tilted board still washes out contrast.

## 4. OpenCV

`findChessboardCornersSB` (sector-based) rather than the legacy `findChessboardCorners`; it is more accurate and does not need `cornerSubPix`.

## 5. Common problems

| Symptom | Cause | Fix |
|---|---|---|
| Not detected | Board cut off, or rows/cols swapped | Keep full board in view; `patternSize` is (cols−1, rows−1) |
| Detected but calibration unstable | Only frontal views | Add tilted views; include images with the board near image edges (fully visible) |
| Reprojection error ≫ 0.3 px | Blur / saturation / wrong square size | Check exposure; copy square size from the edge strip |

## 6. Care

Edges only, flat storage, no solvents. CT-UM-GEN sections 3, 7, 8.
