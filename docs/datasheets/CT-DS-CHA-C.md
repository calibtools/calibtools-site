---
code: CT-DS-CHA-C
title: ChArUco calibration target, ceramic
type: datasheet
rev: A
date: 2026-10-24
status: draft
family: CHA
material: C
---

Lithographed chrome pattern on a white alumina ceramic substrate. Feature accuracy two orders of magnitude better than printed boards, thermally stable, chemically inert. For metrology-grade camera calibration, high-magnification optics, and any setup where the target itself must not be the error budget.

## Ordering

| Part number | Size (W × H) | Squares (rows × cols) | Square / marker | Dictionary | Corners | Markers |
|---|---|---|---|---|---|---|
| CT-CHA-C-110085-{DICT} | 110 × 85 mm | 7 × 10 | 10 / 7.5 mm | 6X6 · 5X5 · 4X4 · AT36 | 54 | 35 |
| CT-CHA-C-150100-{DICT} | 150 × 100 mm | 7 × 11 | 12.5 / 9.5 mm | | 60 | 39 |
| CT-CHA-C-185110-{DICT} | 185 × 110 mm | 7 × 12 | 14 / 10.5 mm | | 66 | 42 |
| CT-CHA-C-230140-{DICT} | 230 × 140 mm | 8 × 14 | 15 / 11 mm | | 91 | 56 |

Start ID 0, row-major, OpenCV ≥ 4.6 placement. Larger ceramic plates (up to 400 × 400 mm) and other grids on request with NRE.

## Specifications

### Geometry

| | |
|---|---|
| Feature position accuracy | ±2 µm (any feature to nominal, at 20 °C) |
| Edge definition | ≤ 1 µm |
| Orthogonality | ±0.002° |

### Physical

| | |
|---|---|
| Substrate | Alumina ceramic (Al₂O₃ ≥ 96 %), white, 3 mm |
| Pattern | Chrome, blue-black, lithographed; low gloss |
| Flatness | ≤ 20 µm over the pattern area |
| Surface | Lapped; Ra ≤ 0.4 µm |
| Weight | ≈ 11 kg/m² (150 × 100: ≈ 0.17 kg) |
| Edges | Ground, 0.5 mm chamfer |
| Mounting | Supplied in a padded case; use ACC-A-FIX-14 soft-jaw fixture or a vacuum/three-point kinematic mount. No holes. |

### Environment

| | |
|---|---|
| Operating temperature | −50 to +200 °C |
| Thermal expansion | ≈ 7.2 µm/(m·°C) |
| Chemical resistance | Inert to water, alcohols, common solvents |
| Cleaning | Lens tissue + isopropyl alcohol; no abrasives |

### Deliverables

| | |
|---|---|
| Inspection report | CT-IR-<serial>: per-feature coordinates (CSV) + flatness + visual |
| Files | `.opencv.json`, `.kalibr.yaml`, `.ros2.yaml`, `.halcon.descr`, `.dxf`, measured-coordinates CSV |
| Lead time | Made to order — 10–15 business days to dispatch |
| Options | ILAC-MRA certificate issued by an accredited third-party laboratory, available as SVC-X-CERT-ILAC (+1–3 weeks; per-feature uncertainty statement) |

## Compliance and customs

RoHS-compliant. HS 9031 80. Fragile — ships in a hard case inside a padded carton.

## Revision history

| Rev | Date | Change |
|---|---|---|
| A | 2026-10 | First issue, planning values |
