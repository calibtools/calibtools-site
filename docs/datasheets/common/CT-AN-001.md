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

For checkerboards: `target_type: 'checkerboard'`, `targetCols`, `targetRows` = inner corners, `rowSpacingMeters`, `colSpacingMeters`. For ChArUco: ChArUco is not native to Kalibr; use AprilGrid targets APR-* for Kalibr.

## ROS 2 camera_calibration

`--size` is inner corners (cols-1 × rows-1); `--square` in metres. ChArUco: `--pattern charuco --charuco_marker_size 0.018 --aruco_dict 6x6_250`.

## HALCON

Use `create_calib_data` + `set_calib_data_calib_object` with the supplied `.descr` file. Our HAL-* targets follow the HALCON calibration-plate convention (circles with finder frame); CHT/CHA boards are supplied with a generated description for `caltab`-style use where supported — verify with `gen_caltab` output.

## MATLAB

`detectCheckerboardPoints` (checkerboard) or `detectCharucoBoardPoints` (R2024a+). Square size in mm as printed in the datasheet.

## COLMAP / other

Export intrinsics from the tool of your choice and convert with `calib.tools/tools/convert/`.
