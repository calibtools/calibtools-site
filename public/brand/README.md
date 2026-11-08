# Brand marks in public/brand/

## Inspection stamp — `stamp-inspected.svg`

- Ø 32 mm round inspection stamp
- All text converted to outlines (no font dependencies)
- Ink color: #E60012 (Calib Red)
- Fields: SN and DATE are outlined underscores (fill manually or programmatically)

## Product mark — `product-mark-inspected.svg`

- 25 × 10 mm rectangular product label mark
- All text converted to outlines (no font dependencies)
- Ink color: #E60012 (Calib Red)
- Field: SN is outlined underscores

## PDF versions — `stamp-inspected.pdf`, `product-mark-inspected.pdf`

- Vector PDFs generated from the outlined SVGs via Playwright
- Exact mm page sizes (32 × 32 mm stamp, 25 × 10 mm mark)
- No embedded fonts — all text is outlined paths

## Regeneration

Run `node scripts/outline-svgs.mjs` to regenerate SVGs and PDFs from the source fonts in `src/assets/fonts/`.
Without Playwright's own Chromium download, set `CT_CHROMIUM_PATH` to a system Chrome (e.g. `CT_CHROMIUM_PATH=/usr/bin/google-chrome`).

Ring band: outer ring r 16 mm, inner ring r 12 mm. The top line (CALIB.TOOLS, 3.2 mm) and the bottom line (DIMENSIONAL INSPECTION, 2.8 mm) both sit inside the band with ≥ 0.5 mm clearance to each ring; the script throws if a size change breaks that.
