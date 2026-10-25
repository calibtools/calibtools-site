---
code: CT-DS-CHT-P
title: Checkerboard calibration target, composite
type: datasheet
rev: A
date: 2026-10-24
status: draft
family: CHT
material: P
---

The classic pattern: highest corner localisation accuracy of any planar target when the whole board is in view. Supported by every calibration toolchain. Choose Fine for more corners per image (higher-resolution cameras, shorter distances) or Coarse for low-resolution or long-distance setups.

## Ordering

| Part number | Size (W × H) | Fine (F): squares · size | Coarse (C): squares · size |
|---|---|---|---|
| CT-CHT-P-200150-{F\|C} | 200 × 150 mm | 7 × 10 · 18 mm | 5 × 7 · 25 mm |
| CT-CHT-P-300200-{F\|C} | 300 × 200 mm | 9 × 14 · 20 mm | 7 × 10 · 25 mm |
| CT-CHT-P-400300-{F\|C} | 400 × 300 mm | 11 × 15 · 25 mm | 8 × 11 · 35 mm |
| CT-CHT-P-600400-{F\|C} | 600 × 400 mm | 12 × 18 · 30 mm | 9 × 14 · 40 mm |
| CT-CHT-P-800600-{F\|C} | 800 × 600 mm | 13 × 18 · 42 mm | 11 × 15 · 50 mm |

Inner corners = (rows − 1) × (cols − 1). Odd × even square counts are used so the pattern has a unique orientation (one black and one white corner square along each edge). Other grids: custom order (CUS) or generate at `calib.tools/tools/generator/` and order as custom.

## Specifications

### Geometry

| | |
|---|---|
| Feature position tolerance | ±0.3 mm + 0.2 mm/m (any corner to nominal grid, at 20 °C) |
| Square pitch, mean | ±0.05 mm |
| Orthogonality | ±0.02° |
| Edge radius | R6 mm |

### Physical

| | |
|---|---|
| Substrate | Aluminium / LDPE / aluminium composite, 6 mm |
| Weight | 6.6 kg/m² |
| Pattern | Direct UV print, matte, black on white; optical density ≥ 1.6 |
| Flatness | ≤ 0.5 mm per metre, three-point support |
| Mounting | 4 × M4 rear inserts (300 × 200 and larger); ¼″ fixture ACC-A-FIX-14 |

### Environment

| | |
|---|---|
| Operating temperature | −50 to +80 °C |
| Thermal expansion | ≈ 24 µm/(m·°C) |
| Outdoor lifetime | up to 3 years |

### Deliverables

Inspection report CT-IR-<serial> · `.opencv.json`, `.kalibr.yaml`, `.ros2.yaml`, `.halcon.descr`, `.dxf` · CT-UM-GEN manual · Made to order · ships in 2–3 weeks · Options: ILAC-MRA certificate issued by an accredited third-party laboratory, available as SVC-X-CERT-ILAC, -L logo, ACC-A-CSE case.

## Compliance and customs

RoHS-compliant materials. HS 9031 80.

## Revision history

| Rev | Date | Change |
|---|---|---|
| A | 2026-10 | First issue, planning values |
