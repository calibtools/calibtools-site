---
code: CT-IR-template
title: Inspection report — Template
type: note
rev: A
date: 2026-10-24
status: draft
---

One report per serial number; number as `CT-IR-<serial>` (e.g. CT-IR-26W43-00017).

## Header

| | |
|---|---|
| Part number | CT-CHA-P-300200-6X6 |
| Description | ChArUco calibration target, composite, 300 × 200 mm, 7 × 10, 25 / 18 mm, DICT_6X6_250 |
| Serial number | 26W43-00017 |
| Lot | L-2611-0382 |
| Datasheet | CT-DS-CHA-P-RevA |
| Inspection date | 2026-11-05 |
| Inspector | [initials] |
| Location | Calib.Tools, Munich, Germany |
| Result | PASS |

## 1. Method

Dimensional inspection of pattern features by optical CMM / calibrated camera + reference scale / glass scale comparator. Ambient 20 ± 1 °C. Measuring instrument model and serial, calibrated date, traceable to DAkkS / PTB / national institute. Measurement uncertainty (k = 2): value mm.

## 2. Pattern geometry

| Feature | Nominal | Measured | Deviation | Tolerance | Result |
|---|---|---|---|---|---|
| Overall pattern width (outer corner to outer corner, X) | 250.000 mm | 250.08 mm | +0.08 mm | ±0.30 + 0.20/m → ±0.35 mm | PASS |
| Overall pattern height (Y) | 175.000 mm | 174.95 mm | −0.05 mm | ±0.34 mm | PASS |
| Square pitch, mean (X) | 25.000 mm | 25.008 mm | +0.008 mm | ±0.05 mm | PASS |
| Square pitch, mean (Y) | 25.000 mm | 24.994 mm | −0.006 mm | ±0.05 mm | PASS |
| Max single-corner deviation from ideal grid (RMS fit) | 0 | 0.11 mm | — | ≤ 0.30 mm | PASS |
| Orthogonality (X vs Y) | 90.000° | 89.996° | −0.004° | ±0.02° | PASS |
| Marker ID sequence | 0…34 row-major | 0…34 | — | exact | PASS |

## 3. Flatness

Measured on n points across the pattern area, board supported on three points.

| Quantity | Measured | Tolerance | Result |
|---|---|---|---|
| Flatness (peak-to-valley) | 0.21 mm | ≤ 0.5 mm / m × 0.3 m = 0.15 mm | PASS |

## 4. Visual

| Check | Result |
|---|---|
| Print defects (voids, pinholes > 0.2 mm, scratches in pattern area) | none |
| Edge and corner condition | OK |
| Edge strip legible, serial matches | OK |

## 5. Statement

The item identified above meets the specifications of datasheet CT-DS-CHA-P-RevA at the time of inspection. This report is an inspection report issued by Calib.Tools; it is not an accredited calibration certificate. An ILAC-MRA certificate issued by an accredited third-party laboratory is available as SVC-X-CERT-ILAC.

Signed: ____________________ · Calib.Tools, Munich · hello@calib.tools

*Report generated from measurement data; raw data retained for 10 years under this serial number.*
