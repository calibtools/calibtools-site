# Typography

## Font family

Geist Sans, Geist Mono and Geist Pixel by Vercel, SIL Open Font License 1.1, self-hosted.

| Family       | File                       | Format          | Size  |
|-------------|----------------------------|-----------------|-------|
| Geist Sans  | GeistVariable.woff2        | Variable wght   | 68 KB |
| Geist Mono  | GeistMonoVariable.woff2    | Variable wght   | 69 KB |
| Geist Pixel | GeistPixel-Square.woff2    | Static 400      | 28 KB |

Total font transfer: ~169 KB.

## Roles

| Role         | Family      | Weight | Class         | Where                                        |
|-------------|-------------|--------|---------------|----------------------------------------------|
| Body text    | Geist Sans  | 400    | (default)     | Paragraphs, descriptions                     |
| Semibold UI  | Geist Sans  | 600    | font-semibold | Buttons, nav links, labels                   |
| Display      | Geist Sans  | 800    | .h-display    | H1, H2 headings                              |
| Measurements | Geist Mono  | 400-500| .spec         | Prices, SKUs, spec values, tolerances        |
| Filenames    | Geist Mono  | 400    | font-mono     | Config file names, code snippets             |
| Accent       | Geist Pixel | 400    | .font-pixel   | Eyebrows, badges, stat numbers               |
| Eyebrow      | Geist Pixel | 400    | .eyebrow      | Section labels, category markers             |
| Badge        | Geist Pixel | 400    | .badge        | Status indicators, feature callouts          |
| Stat         | Geist Pixel | 400    | .stat         | Large numeric highlights (48px)              |
| Logo wordmark| Geist Sans  | 800    | —             | "Calib.Tools" in nav                         |

## Size table

| Element       | Mobile    | Desktop   | Tracking | Line-height |
|--------------|-----------|-----------|----------|-------------|
| Hero H1       | 40px 800  | 68px 800  | -0.03em  | 1.02-1.08   |
| Section H2    | 28px 800  | 40px 800  | -0.03em  | tight       |
| Body          | 16px 400  | 17px 400  | normal   | 1.6         |
| Buttons/nav   | 15px 600  | 15-16px 600| normal  | normal      |
| Small text    | 13px 400  | 14px 400  | normal   | normal      |
| Spec values   | 13px mono | 15px mono | normal   | normal      |
| Eyebrow       | 13px pixel| 13px pixel| 0.04em   | normal      |
| Badge         | 12px pixel| 12px pixel| 0.04em   | normal      |
| Stat number   | 48px pixel| 48px pixel| normal   | 1           |

## Geist Pixel rules

Pixel is an accent typeface. Misuse makes the page feel like a retro game.

1. **Accent only.** Eyebrow labels, status badges, large stat numbers. Never body text.
2. **Square variant.** Use `font-variation-settings: 'ELSH' 1` (built into `.font-pixel`).
3. **Minimum 12px.** Never set Pixel below 12px.
4. **Uppercase and digits.** Pixel is designed for short uppercase labels and numbers.
5. **Never a link.** Pixel text must not be clickable (use Sans for links).
6. **Never near the calibration pattern on printed boards.** Pixel's blocky shapes could
   be confused with pattern elements in print contexts.

## Fallback strategy

A `Geist Fallback` @font-face face is defined on local Arial with metric overrides
(`size-adjust: 99.6%`, `ascent-override: 97.5%`, `descent-override: 24.0%`,
`line-gap-override: 0%`) to minimise CLS while the variable WOFF2 loads.

## Licence

All three Geist families are released by Vercel under the SIL Open Font License 1.1.
The licence file is at `public/fonts/OFL.txt`.
