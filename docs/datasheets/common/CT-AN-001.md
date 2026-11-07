---
code: CT-AN-001
title: Pattern files and software setup
type: note
rev: A
date: 2026-10-24
status: draft
---

Applies to all Calib.Tools planar targets.

## OpenCV (≥ 4.7, Python)

Notes: OpenCV ≥ 4.6 changed the ChArUco marker placement convention for boards with an even number of rows; our JSON carries `legacy_pattern` so the detector matches the printed board. Rows × columns are counted in squares, not inner corners. For plain checkerboards use `cv2.findChessboardCornersSB` with `(cols-1, rows-1)` inner corners.

## Kalibr

For checkerboards: `target_type: 'checkerboard'`, `targetCols`, `targetRows` = inner corners, `rowSpacingMeters`, `colSpacingMeters`. Symmetric circle grids: `target_type: 'circlegrid'` with circle counts. ChArUco is not native to Kalibr, so no Kalibr file is generated for it; use AprilGrid targets APR-* for Kalibr.

## ROS 2 camera_calibration

`--size` is inner corners (cols-1 × rows-1); `--square` in meters. ChArUco: `--pattern charuco --charuco_marker_size 0.018 --aruco_dict 6x6_250`.

## HALCON

HAL-* targets follow the HALCON calibration-plate convention (circles with finder frame) and come with a `.descr` file: use `create_calib_data`, `set_calib_data_calib_object` with the `.descr`, then `find_calib_object`. CHT/CHA boards are not HALCON plates. The generator's `.halcon.txt` gives their inner corners as a 3D point tuple for `set_calib_data_calib_object`; detect the corners (for ChArUco, with OpenCV) and pass them with `set_calib_data_observ_points`.

## MATLAB

`detectCheckerboardPoints` (checkerboard) or `detectCharucoBoardPoints` (R2024a+). Square size in mm as printed in the datasheet.

## COLMAP / other

Export intrinsics from the tool of your choice and convert with `calib.tools/tools/convert/`.
