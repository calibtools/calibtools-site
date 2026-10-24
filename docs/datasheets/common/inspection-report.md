---
code: CT-IR-001
title: Dimensional inspection report template
type: note
rev: A
date: 2026-10-24
status: draft
---

## About this document

Every Calib.Tools calibration target ships with a dimensional inspection report. This document describes the inspection process and what each measurement means.

## Inspection scope

| Measurement | Method | Acceptance criterion |
|-------------|--------|---------------------|
| Board dimensions (L x W) | Digital caliper, 0.01 mm | Within +/-0.5 mm of nominal |
| Thickness | Digital caliper, 0.01 mm | Within +/-0.3 mm of nominal |
| Feature position | Vision CMM or optical comparator | Within stated feature tolerance |
| Flatness | Straight edge + feeler gauge | <= stated flatness specification |
| Corner radius | Radius gauge | 6 +/-1 mm (composite) |
| Visual inspection | Naked eye, 300 mm distance | No defects, smearing, or delamination |

## Reading the report

- **Nominal**: the design value
- **Measured**: the actual measured value
- **Deviation**: measured minus nominal
- **Pass/Fail**: whether the deviation is within the acceptance criterion

All measurements are performed at 20 +/-2 C and 45 +/-15% RH.

## Equipment

Inspection equipment is calibrated annually with traceability to national standards (PTB or equivalent).

## ILAC calibration certificate

For applications requiring traceable measurement uncertainty, add the ILAC-recognised calibration certificate (SVC-X-CERT-ILAC) when ordering. This provides:

- Accredited dimensional measurements
- Measurement uncertainty statement
- Traceability chain to SI units
- Certificate valid for 12 months
