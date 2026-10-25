---
code: CT-DS-CHA-P
title: ChArUco calibration target, composite
type: datasheet
rev: A
date: 2026-10-24
status: draft
family: CHA
material: P
---

ChArUco combines a checkerboard with ArUco markers in the white squares. Markers identify each corner, so the board can be partly outside the image or partly occluded and still contribute corners — which is exactly where lens distortion is strongest. Native in OpenCV (`cv2.aruco.CharucoBoard`), supported by MATLAB and most multi-camera toolchains.

## Ordering

| Part number | Size (W × H) | Squares (rows × cols) | Square / marker | Dictionary | Corners | Markers |
|---|---|---|---|---|---|---|
| CT-CHA-P-200150-{DICT} | 200 × 150 mm | 5 × 7 | 25 / 18 mm | see below | 24 | 17 |
| CT-CHA-P-300200-{DICT} | 300 × 200 mm | 7 × 10 | 25 / 18 mm | | 54 | 35 |
| CT-CHA-P-400300-{DICT} | 400 × 300 mm | 9 × 12 | 30 / 22 mm | | 88 | 54 |
| CT-CHA-P-600400-{DICT} | 600 × 400 mm | 9 × 14 | 40 / 30 mm | | 104 | 63 |
| CT-CHA-P-800600-{DICT} | 800 × 600 mm | 11 × 15 | 50 / 37 mm | | 140 | 82 |

`{DICT}`: `6X6` = DICT_6X6_250 (default, most robust) · `5X5` = DICT_5X5_100 · `4X4` = DICT_4X4_50 (decodes at lower resolution, fewer unique IDs) · `AT36` = AprilTag 36h11. Start ID 0, row-major over white squares, OpenCV ≥ 4.6 placement convention (`legacy_pattern: false`). Other grids, dictionaries or start IDs: custom order (CUS).

Pattern area is centred with a white quiet zone ≥ 1 square on all sides; the edge strip with part number, serial and 100 mm scale bar sits outside the quiet zone.

## Specifications

### Geometry

| | |
|---|---|
| Feature position tolerance | ±0.3 mm + 0.2 mm/m (any corner to nominal grid, at 20 °C) |
| Square pitch, mean | ±0.05 mm |
| Orthogonality | ±0.02° |
| Marker-to-square ratio | 0.74 |
| Edge radius | R6 mm |

### Physical

| | |
|---|---|
| Substrate | Aluminium / LDPE / aluminium composite, 6 mm |
| Weight | 6.6 kg/m² (300 × 200: ≈ 0.4 kg · 800 × 600: ≈ 3.2 kg) |
| Pattern | Direct UV print, matte, black on white; optical density ≥ 1.6 |
| Flatness | ≤ 0.5 mm per metre, board supported on three points |
| Rigidity (E·J) | ≈ 3800 kN·cm²/m |
| Mounting | 4 × M4 threaded inserts on the rear (300 × 200 and larger); ¼″ fixture ACC-A-FIX-14 clamps any size |

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
| Inspection report | CT-IR-<serial>, per board, dimensional + flatness + visual |
| Files | `.opencv.json`, `.kalibr.yaml` (checkerboard mode), `.ros2.yaml`, `.halcon.descr`, `.dxf` |
| Documents | this datasheet, CT-UM-GEN user manual, CT-UM-CHA-P quick start |
| Lead time | Made to order · ships in 2–3 weeks |
| Options | ILAC-MRA certificate issued by an accredited third-party laboratory, available as SVC-X-CERT-ILAC (+1–3 weeks) · logo print (-L) · hard case (ACC-A-CSE) |

## Compliance and customs

RoHS-compliant materials. HS 9031 80. Not a toy; not for food contact.

## Revision history

| Rev | Date | Change |
|---|---|---|
| A | 2026-10 | First issue, planning values |

*Specifications subject to change; current revision at calib.tools/targets/charuco-composite/*
