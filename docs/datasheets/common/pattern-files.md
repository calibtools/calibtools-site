---
code: CT-PF-001
title: Pattern files and configuration formats
type: note
rev: A
date: 2026-10-24
status: draft
---

## Overview

Every Calib.Tools calibration target includes machine-readable configuration files for common calibration frameworks. This document describes each file format and how to use them.

## File formats

| Extension | Framework | Description |
|-----------|-----------|-------------|
| .opencv.json | OpenCV | JSON with pattern type, dimensions, dictionary |
| .kalibr.yaml | Kalibr (ETH) | YAML target configuration |
| .ros2.yaml | ROS 2 | Camera calibration parameters |
| .halcon.descr | MVTec HALCON | Calibration plate description |
| .dxf | CAD | Board outline for fixture design |

## OpenCV JSON

The OpenCV JSON file contains all parameters needed for cv2.aruco.CharucoBoard or cv2.findChessboardCorners:

- pattern: "ChArUco" or "Checkerboard"
- rows, cols: grid dimensions
- square_mm, marker_mm: feature sizes in millimetres
- dictionary: ArUco dictionary name
- start_id: first marker ID in this board
- generator: "Calib.Tools"

## Kalibr YAML

The Kalibr YAML follows the format expected by kalibr_calibrate_cameras:

- target_type: "aprilgrid" or "checkerboard"
- tagCols, tagRows: grid dimensions
- tagSize, tagSpacing: in metres (SI units)

## Custom configurations

Generate custom pattern configurations for any grid size, dictionary, and starting ID using the free pattern generator at calib.tools/tools/generator/.

## Coordinate system

All Calib.Tools patterns use the OpenCV coordinate convention:

- Origin: top-left corner of the pattern
- X axis: pointing right
- Y axis: pointing down
- Corner ordering: row-major, matching cv2.findChessboardCorners

For Kalibr, the Y axis is inverted (pointing up). The provided YAML files account for this.
