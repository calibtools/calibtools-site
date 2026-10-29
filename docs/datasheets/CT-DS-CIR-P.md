---
code: CT-DS-CIR-P
title: Circle grid calibration target, composite
type: datasheet
rev: A
date: 2026-10-29
status: draft
family: CIR
material: P
---

Circle grids use filled dot centroids rather than corner intersections. Centroid detection is more robust under defocus, low contrast and oblique viewing angles. Available in symmetric layout (grid of evenly spaced dots) and asymmetric layout (staggered rows for unambiguous orientation without additional markers). Both variants are supported by OpenCV (`cv::findCirclesGrid`) and HALCON.

## Ordering

### Symmetric (SYM)

| Part number | Size (W × H) | Circles (rows × cols) | Circle ⌀ / spacing | Total circles |
|---|---|---|---|---|
| CT-CIR-P-200150-SYM | 200 × 150 mm | 7 × 10 | 12 / 20 mm | 70 |
| CT-CIR-P-300200-SYM | 300 × 200 mm | 9 × 14 | 14 / 22 mm | 126 |
| CT-CIR-P-400300-SYM | 400 × 300 mm | 11 × 16 | 17 / 25 mm | 176 |
| CT-CIR-P-600400-SYM | 600 × 400 mm | 13 × 20 | 20 / 30 mm | 260 |
| CT-CIR-P-800600-SYM | 800 × 600 mm | 16 × 24 | 22 / 33 mm | 384 |

### Asymmetric (ASYM)

| Part number | Size (W × H) | Circles (rows × cols) | Circle ⌀ / spacing | Total circles |
|---|---|---|---|---|
| CT-CIR-P-200150-ASYM | 200 × 150 mm | 7 × 5 | 12 / 20 mm | 35 |
| CT-CIR-P-300200-ASYM | 300 × 200 mm | 9 × 7 | 14 / 22 mm | 63 |
| CT-CIR-P-400300-ASYM | 400 × 300 mm | 11 × 8 | 17 / 25 mm | 88 |
| CT-CIR-P-600400-ASYM | 600 × 400 mm | 13 × 10 | 20 / 30 mm | 130 |
| CT-CIR-P-800600-ASYM | 800 × 600 mm | 16 × 12 | 22 / 33 mm | 192 |

Spacing is centre-to-centre pitch. Asymmetric boards use a half-pitch row offset; pass `CALIB_CB_ASYMMETRIC_GRID` to `cv::findCirclesGrid`. Other grid sizes or circle dimensions: custom order (CUS).

Pattern area is centred with a white quiet zone ≥ 1 circle pitch on all sides; the edge strip with part number, serial and 100 mm scale bar sits outside the quiet zone.

## Specifications

### Geometry

| | |
|---|---|
| Feature position tolerance | ±0.3 mm + 0.2 mm/m (any circle centre to nominal grid, at 20 °C) |
| Circle pitch, mean | ±0.05 mm |
| Circularity | ≤ 0.05 mm radial deviation |
| Edge radius | R6 mm |

### Physical

| | |
|---|---|
| Substrate | Aluminium / LDPE / aluminium composite, 6 mm |
| Weight | 6.6 kg/m² (300 × 200: ≈ 0.4 kg · 800 × 600: ≈ 3.2 kg) |
| Pattern | Direct UV print, matte, black on white; optical density ≥ 1.6 |
| Flatness | ≤ 0.5 mm per metre, board supported on three points |
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
| Files | `.opencv.json`, `.halcon.descr`, `.dxf` |
| Documents | this datasheet, CT-UM-GEN user manual |
| Lead time | Made to order · ships in 2–3 weeks |
| Options | ILAC-MRA certificate issued by an accredited third-party laboratory, available as SVC-X-CERT-ILAC (+1–3 weeks) · logo print (-L) · hard case (ACC-A-CSE) |

## Compliance and customs

RoHS-compliant materials. HS 9031 80. Not a toy; not for food contact.

## Revision history

| Rev | Date | Change |
|---|---|---|
| A | 2026-10 | First issue, planning values |

*Specifications subject to change; current revision at calib.tools/targets/circle-grid-composite/*
