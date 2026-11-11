---
code: CT-DS-CIR-P
title: Circle Grid Calibration Target, Aluminum Composite
type: datasheet
rev: A
date: 2026-10-29
status: draft
family: CIR
material: P
---

Circle grids use filled dot centroids rather than corner intersections. Centroid detection is more robust under defocus, low contrast and oblique viewing angles. Available in symmetric layout (grid of evenly spaced dots) and asymmetric layout (staggered rows for unambiguous orientation without additional markers). Both variants are supported by OpenCV (`cv::findCirclesGrid`). In HALCON, use them as a point-based calibration object; HALCON's own plate finder detects only HAL-* plates.

## Ordering

### Symmetric (SYM)

| Part number | Size (W × H) | Circles (rows × cols) | Circle ⌀ / spacing | Total circles |
|---|---|---|---|---|
| CT-CIR-P-200X150-SYM | 200 × 150 mm | 5 × 8 | 12 / 20 mm | 40 |
| CT-CIR-P-300X200-SYM | 300 × 200 mm | 7 × 12 | 14 / 22 mm | 84 |
| CT-CIR-P-400X300-SYM | 400 × 300 mm | 10 × 14 | 17 / 25 mm | 140 |
| CT-CIR-P-600X400-SYM | 600 × 400 mm | 11 × 18 | 20 / 30 mm | 198 |
| CT-CIR-P-800X600-SYM | 800 × 600 mm | 16 × 22 | 22 / 33 mm | 352 |

### Asymmetric (ASYM)

| Part number | Size (W × H) | Circles (rows × cols) | Circle ⌀ / spacing | Total circles |
|---|---|---|---|---|
| CT-CIR-P-200X150-ASY | 200 × 150 mm | 5 × 4 | 12 / 20 mm | 20 |
| CT-CIR-P-300X200-ASY | 300 × 200 mm | 7 × 6 | 14 / 22 mm | 42 |
| CT-CIR-P-400X300-ASY | 400 × 300 mm | 9 × 7 | 17 / 25 mm | 63 |
| CT-CIR-P-600X400-ASY | 600 × 400 mm | 11 × 9 | 20 / 30 mm | 99 |
| CT-CIR-P-800X600-ASY | 800 × 600 mm | 15 × 11 | 22 / 33 mm | 165 |

Spacing is the pitch of the underlying square lattice. A symmetric grid has a circle at every lattice position; its `findCirclesGrid` pattern size is (cols, rows). An asymmetric grid has a circle at every other position, so circles in a row are two pitches apart and each row is shifted by one pitch against the next; rows × cols above are rows and circles per row, and the pattern size is (circles per row, rows) with `CALIB_CB_ASYMMETRIC_GRID`. Every layout leaves at least one pitch of white between the outermost circles and the board edge. Other grid sizes or circle dimensions: custom order (CUS).

Pattern area is centered with a white quiet zone ≥ 1 circle pitch on all sides; the edge strip with part number, serial and 100 mm scale bar sits outside the quiet zone.

## Specifications

### Geometry

| | |
|---|---|
| Feature position tolerance | ±0.3 mm + 0.2 mm/m (any circle center to nominal grid, at 20 °C) |
| Circle pitch, mean | ±0.05 mm |
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
| Files | `.opencv.json`, `.kalibr.yaml` (symmetric only), `.dxf` |
| Documents | this datasheet, CT-UM-GEN user manual |
| Lead time | Made to order · ships in 2–3 weeks |
| Options | Logo print (-L) · hard case (CT-ACC-M-CSE400) · custom NRE |

## Compliance and customs

RoHS-compliant materials. HS 9031 80. Not a toy; not for food contact.

## Revision history

| Rev | Date | Change |
|---|---|---|
| A | 2026-10 | First issue, planning values |

*Specifications subject to change; current revision at calib.tools/targets/circle-grid-composite/*
