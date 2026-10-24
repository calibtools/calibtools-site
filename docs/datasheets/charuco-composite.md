---
code: CT-DS-CHA-P
title: ChArUco composite calibration target
type: datasheet
rev: A
date: 2026-10-24
status: draft
family: CHA
material: P
---

## Overview

The ChArUco composite calibration target combines a checkerboard grid with ArUco fiducial markers on a rigid aluminium composite substrate. It enables simultaneous intrinsic and extrinsic calibration with sub-pixel corner detection and unique marker identification.

Suitable for industrial machine vision, robotics, and research applications where a flat, dimensionally stable target is required.

## Available sizes

| Part number | Board size | Grid | Square | Marker | Dictionary | Tolerance |
|-------------|-----------|------|--------|--------|------------|-----------|
| CHA-P-6X6-200x150-25 | 200 x 150 mm | 7 x 10 | 25 mm | 18 mm | DICT_6X6_250 | +/-0.3 mm |
| CHA-P-6X6-300x200-25 | 300 x 200 mm | 7 x 10 | 25 mm | 18 mm | DICT_6X6_250 | +/-0.3 mm |
| CHA-P-6X6-400x300-30 | 400 x 300 mm | 9 x 12 | 30 mm | 22 mm | DICT_6X6_250 | +/-0.3 mm |
| CHA-P-6X6-600x400-30 | 600 x 400 mm | 12 x 18 | 30 mm | 22 mm | DICT_6X6_250 | +/-0.3 mm |
| CHA-P-6X6-800x600-40 | 800 x 600 mm | 14 x 18 | 40 mm | 30 mm | DICT_6X6_250 | +/-0.3 mm |

## Substrate

- Material: aluminium / LDPE composite (Dibond-type), 6 mm thick
- Surface: UV-printed, matte finish, scratch-resistant
- CTE: approximately 24 um/(m.K)
- Operating temperature: -50 to +80 C
- Weight: 400 g (200 x 150 mm) to 3200 g (800 x 600 mm)

## Feature accuracy

- Feature tolerance: +/-0.3 mm + 0.2 mm/m (board-size dependent)
- Flatness: <= 0.5 mm/m
- Corner radius: 6 mm

## Pattern details

The ChArUco pattern consists of a checkerboard where the white squares contain ArUco markers from the specified dictionary. Corner detection uses the checkerboard intersections; marker IDs provide unique identification and allow partial board visibility.

Default dictionary: DICT_6X6_250 (250 unique markers, 6x6 bit grid).

Custom dictionaries (DICT_4X4_50, DICT_5X5_100, AprilTag 36h11) available on request.

## Mounting

Four M4 threaded inserts are installed in the rear panel for tripod or fixture mounting. A 1/4-20 UNC fixture adaptor is available separately (ACC-A-MNT-01).

## Deliverables

Each target ships with:

- Dimensional inspection report (included)
- Datasheet PDF
- DXF board outline
- OpenCV JSON configuration
- Kalibr YAML configuration
- ROS 2 YAML configuration
- HALCON description file

ILAC-recognised calibration certificate available as an add-on (SVC-X-CERT-ILAC).

## Storage and handling

Store flat, away from direct sunlight and moisture. Do not stack heavy items on the target. Clean with a soft, dry cloth. Avoid solvents.
