# Datasheets

Markdown source files for product datasheets and common documents.
`scripts/build-datasheets.mjs` renders each `.md` (except this README) to PDF
using pdf-lib with the Geist font family.

## Front matter

```yaml
---
code: CT-DS-CHA-P        # document code — used as filename
title: ChArUco composite calibration target
type: datasheet           # datasheet | manual | note
rev: A
date: 2026-10-24
status: draft             # draft | released
family: CHA               # SKU prefix (first segment) — for product matching
material: P               # SKU material code (second segment)
---
```

## Conventions

- One file per product family × material combination for datasheets.
- Common documents (user manual, inspection report template, pattern files note)
  go in `common/`.
- Images: reference pattern renders from the generator module with relative paths
  like `../../src/assets/patterns/charuco-6x6-250.svg`. The build script will
  embed them.
- Tables: Markdown pipe tables. Numeric columns are right-aligned in the PDF.
- Status `draft` renders a "DRAFT" watermark on the PDF.
