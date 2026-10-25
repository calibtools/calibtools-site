# Brand marks in public/brand/

## Inspection stamp — `stamp-inspected.svg`

- Ø 32 mm round inspection stamp
- All text converted to outlines (no font dependencies)
- Ink colour: #E60012 (Calib Red)
- Fields: SN and DATE are outlined underscores (fill manually or programmatically)

## Product mark — `product-mark-inspected.svg`

- 25 × 10 mm rectangular product label mark
- All text converted to outlines (no font dependencies)
- Ink colour: #E60012 (Calib Red)
- Field: SN is outlined underscores

## Regeneration

Run `node scripts/outline-svgs.mjs` to regenerate from the source fonts in `src/assets/fonts/`.
