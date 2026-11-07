---
code: CT-DS-HAL-P
title: HALCON Calibration Plate, Aluminum Composite
type: datasheet
rev: A
date: 2026-10-29
status: draft
family: HAL
material: P
---

MVTec HALCON calibration plate. A central reference circle is surrounded by smaller dot marks arranged in a regular grid. The asymmetric mark sizes allow `find_caltab` to determine board orientation without additional fiducials. Designed for use with the `find_caltab` and `calibrate_cameras` operators in HALCON 12 and later.

## Ordering

| Part number | Size (W × H) | Mark grid | Central mark ⌀ | Grid mark ⌀ | Total marks |
|---|---|---|---|---|---|
| CT-HAL-P-200X150-STD | 200 × 150 mm | 7 × 5 | 8 mm | 3 mm | 36 |
| CT-HAL-P-300X200-STD | 300 × 200 mm | 7 × 7 | 10 mm | 4 mm | 50 |
| CT-HAL-P-400X300-STD | 400 × 300 mm | 9 × 7 | 12 mm | 5 mm | 64 |
| CT-HAL-P-600X400-STD | 600 × 400 mm | 11 × 9 | 14 mm | 6 mm | 100 |
| CT-HAL-P-800X600-STD | 800 × 600 mm | 13 × 11 | 16 mm | 7 mm | 144 |

Mark grid is (rows × cols) including the central reference mark. Total marks = rows × cols. A `.descr` description file for HALCON is supplied with every board; it encodes the exact mark positions and diameters as measured during inspection. Other grid sizes: custom order (CUS).

Pattern area is centered with a white quiet zone ≥ 1 mark pitch on all sides; the edge strip with part number, serial and 100 mm scale bar sits outside the quiet zone.

## Specifications

### Geometry

| | |
|---|---|
| Feature position tolerance | ±0.3 mm + 0.2 mm/m (any mark center to nominal grid, at 20 °C) |
| Mark pitch, mean | ±0.05 mm |
| Circularity | ≤ 0.05 mm radial deviation |
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
| Files | `.halcon.descr`, `.opencv.json`, `.dxf` |
| Documents | this datasheet, CT-UM-GEN user manual |
| Lead time | Made to order · ships in 2–3 weeks |
| Options | Logo print (-L) · hard case (CT-ACC-M-CSE400) · custom NRE |

## Compliance and customs

RoHS-compliant materials. HS 9031 80. Not a toy; not for food contact.

## Revision history

| Rev | Date | Change |
|---|---|---|
| A | 2026-10 | First issue, planning values |

*Specifications subject to change; current revision at calib.tools/targets/halcon-composite/*
