---
code: CT-UM-CHA-P
title: ChArUco composite target — Quick start
type: manual
rev: A
date: 2026-10-24
status: draft
family: CHA
material: P
---

## 1. Which dictionary did you get?

Printed in the edge strip: `DICT_6X6_250`, `DICT_5X5_100`, `DICT_4X4_50` or `AprilTag 36h11`. Your detector must be set to the same dictionary or it will find the checkerboard corners but no markers.

## 2. Three things ChArUco lets you do that a plain checkerboard does not

- **Push the board into the image corners.** Partial views are fine; every detected marker identifies its neighbouring corners. Lens distortion is constrained best at the image edges, so use this.
- **Calibrate multi-camera rigs with partial overlap.** Cameras that see different parts of the same board still share a common coordinate frame.
- **Skip the "full board visible" check** that fails so many checkerboard images.

## 3. Capture checklist

- 15–25 images single camera, 30–40 per pair for stereo.
- Include at least 4 images where the board is cut off by the image edge on purpose.
- Tilt ±30–45° in both axes; vary distance 2×.
- Keep markers at least ~20 px wide in the image (`4X4` tolerates smaller; `6X6` needs a bit more resolution but is far more robust against false detections).
- Test one image at `calib.tools/tools/check/` before capturing the full set.

## 4. OpenCV in five lines

Units: if you pass mm here, your extrinsics come out in mm. Pass metres for ROS conventions.

## 5. Common problems

| Symptom | Cause | Fix |
|---|---|---|
| Corners found, markers 0 | Wrong dictionary | Match the edge-strip dictionary |
| Markers found, corners mis-ordered / mirrored | Legacy pattern flag | `setLegacyPattern(false)` for boards from Calib.Tools (OpenCV ≥ 4.6 convention) |
| Reprojection error > 0.5 px on a rigid board | Motion blur, saturation, or too few tilted views | Re-check exposure; add tilted and corner-of-image views; run `calib.tools/tools/quality/` on your result |
| Error only on one size | Wrong square size entered | Square and marker sizes are in the edge strip and the JSON — do not type them from memory |

## 6. Care

Edges only, flat storage, no solvents on the print. Full details: CT-UM-GEN section 3, 7, 8.

Support: hello@calib.tools with serial number and one full-resolution image.
