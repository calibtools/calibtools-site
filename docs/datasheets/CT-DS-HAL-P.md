---
code: CT-DS-HAL-P
title: HALCON Calibration Plate, Aluminum Composite
type: datasheet
rev: A
date: 2026-11-11
status: draft
family: HAL
material: P
---

HALCON calibration plate with rectangularly arranged marks, the layout that HALCON's `gen_caltab` operator describes: black circular marks of one size in a regular grid on a white field, inside a black frame with a triangular mark in one corner. The frame lets `find_caltab` locate the plate and the triangle fixes its orientation. For use with `find_calib_object`, `find_caltab` and `calibrate_cameras`.

## Ordering

| Part number | Size (W × H) |
|---|---|
| CT-HAL-P-200X150-STD | 200 × 150 mm |
| CT-HAL-P-300X200-STD | 300 × 200 mm |
| CT-HAL-P-400X300-STD | 400 × 300 mm |
| CT-HAL-P-600X400-STD | 600 × 400 mm |
| CT-HAL-P-800X600-STD | 800 × 600 mm |

The number of marks, the mark distance and the mark diameter are fixed with the order: send your existing `.descr` file, or the `gen_caltab` parameters (marks in x and y, mark distance, diameter ratio), and the plate is made to them. A `.descr` description file in `gen_caltab` format is supplied with every plate. Plates with hexagonally arranged marks (`create_caltab`, `.cpd`): custom order (CUS).

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
