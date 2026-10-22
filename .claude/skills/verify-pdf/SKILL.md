---
name: verify-pdf
description: Generate A4/A3/Letter PDFs from the pattern generator and verify printed dimensions by reading vector paths back.
---
1. Run `pnpm build` and `node scripts/export-pdf.mjs --all` (to be created with pdf-lib).
2. For each PDF, read vector rectangles with pdfplumber (`python -I scripts/measure_pdf.py <file>`).
3. Report: scale bar length (expect 100.0 ± 0.1 mm), first/last square edges, board size.
4. Fail if any deviation > 0.2 mm. Print a table of deviations in the reply.
