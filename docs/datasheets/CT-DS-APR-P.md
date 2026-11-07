---
code: CT-DS-APR-P
title: AprilGrid Calibration Target, Aluminum Composite
type: datasheet
rev: A
date: 2026-10-29
status: draft
family: APR
material: P
---

AprilGrid uses AprilTag 36h11 markers arranged in a regular grid. It is the standard target for Kalibr camera–IMU calibration and is also supported by the OpenCV ArUco module (`cv2.aruco.DICT_APRILTAG_36h11`). Each tag carries a unique ID, so partially visible boards still yield usable detections — useful at field edges where distortion is greatest.

## Ordering

| Part number | Size (W × H) | Tags (rows × cols) | Tag / gap | Markers |
|---|---|---|---|---|
| CT-APR-P-200X150-T36 | 200 × 150 mm | 4 × 6 | 25 / 7.5 mm | 24 |
| CT-APR-P-300X200-T36 | 300 × 200 mm | 5 × 7 | 30 / 9 mm | 35 |
| CT-APR-P-400X300-T36 | 400 × 300 mm | 6 × 8 | 35 / 10.5 mm | 48 |
| CT-APR-P-600X400-T36 | 600 × 400 mm | 7 × 10 | 45 / 13.5 mm | 70 |
| CT-APR-P-800X600-T36 | 800 × 600 mm | 9 × 12 | 50 / 15 mm | 108 |

Dictionary: AprilTag 36h11. Tag spacing ratio 0.3 (gap = 0.3 × tag side). IDs start at 0, row-major. Kalibr `tagSpacing` parameter equals the gap divided by the tag side (0.3). Other grid sizes or spacing ratios: custom order (CUS).

Pattern area is centered with a white quiet zone ≥ 1 tag pitch on all sides; the edge strip with part number, serial and 100 mm scale bar sits outside the quiet zone.

## Specifications

### Geometry

| | |
|---|---|
| Feature position tolerance | ±0.3 mm + 0.2 mm/m (any tag center to nominal grid, at 20 °C) |
| Tag pitch, mean | ±0.05 mm |
| Tag-to-gap ratio | 0.3 |
| Edge radius | R6 mm |

### Physical

| | |
|---|---|
| Substrate | Aluminum / LDPE / aluminum composite, 6 mm |
| Weight | 6.6 kg/m² (300 × 200: ≈ 0.4 kg · 800 × 600: ≈ 3.2 kg) |
| Pattern | Direct UV print, matte, black on white; optical density ≥ 1.6 |
| Flatness | ≤ 0.5 mm per meter, board supported on three points |
| Mounting | 4 × M4 threaded inserts on the rear (300 × 200 and larger); ¼″ fixture CT-ACC-M-FIX14 clamps any size |

### Environment

| | |
|---|---|
| Operating temperature | −50 to +80 °C |
| Thermal expansion | ≈ 24 µm/(m·°C) |
| Storage | −20 to +60 °C, dry |
| Outdoor lifetime | up to 3 years (UV-stable print) |
| Cleaning | water or ≤ 70 % isopropyl alcohol, soft cloth |

### Deliverables

| | |
|---|---|
| Measurement | Every board is measured before it ships (dimensional, flatness, visual) |
| Files | `.opencv.json`, `.kalibr.yaml`, `.ros2.yaml`, `.dxf` |
| Documents | this datasheet, CT-UM-GEN user manual |
| Lead time | Made to order · ships in 2–3 weeks |
| Options | Logo print (-L) · hard case (CT-ACC-M-CSE400) · custom NRE |

## Compliance and customs

RoHS-compliant materials. HS 9031 80. Not a toy; not for food contact.

## Revision history

| Rev | Date | Change |
|---|---|---|
| A | 2026-10 | First issue, planning values |

*Specifications subject to change; current revision at calib.tools/targets/aprilgrid-composite/*
