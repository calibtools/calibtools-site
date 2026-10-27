# Calib.Tools brand assets

Brand kit source: `~/Documents/Calib.Tools/05-品牌与设计/Logo/calibtools-brand-kit/`

## Logo system (v1.0, October 2025)

The previous circular ring logo (`logo-circle-light.svg`, `logo-circle-dark.svg`) is retired.
The new system has four marks, each in positive (light bg) and negative (dark bg) variants:

| Mark | File in `public/brand/` | Use |
|---|---|---|
| Horizontal lockup | `lockup-light.svg` / `lockup-dark.svg` | Desktop header nav (h 40 px) |
| C.T icon | `icon-light.svg` / `icon-dark.svg` | Mobile header (h 48 px), app icon, favicon source |
| Wordmark framed | `wordmark-framed-light.svg` / `wordmark-framed-dark.svg` | Footer (h 28 px), documents |
| Wordmark compact | `wordmark-compact-light.svg` / `wordmark-compact-dark.svg` | Product label lines, inline |

SVGs have non-standard viewBoxes (negative origins). Size only with CSS `height`; never set both `width` and `height`.

### Clear-space rules

- Around lockups/wordmarks: clear space = cap-height H of the word "CALIB" in that mark.
- Around the C.T icon: clear space = 0.25 × icon diameter D.
- Minimum rendered widths: lockup 140 px, compact wordmark 90 px, icon 16 px.

## Colour — red accent rule

Red `#E60012` is used **only as an accent** — roughly 1 % of any layout: the square point, the X-axis arrow,
CTA buttons, and small highlights. It is never used as a background fill, full-width stripe, body-text colour,
or large typographic element. On the home page only the two CTA buttons may use red as a background.
Source: `06-colours/colours.json` in the brand kit.

### Dark-theme red text token

For text set against the dark ground (`#0A0A0A`), use `#FF3B47` instead of `#E60012` to meet 4.5:1 contrast.
This is **not** in the brand kit — it is a site-derived token for WCAG compliance. The kit red stays for anything
≥ 18 px and for decorative accents that are not essential text.

## Favicons and app icons

All favicon/app-icon files live at the **public root** (`public/`), not in subdirectories.
The `<head>` snippet follows the kit's `head-snippet.html` exactly: ICO first (pixel-fitted 16/32/48),
then PNG fallbacks, then apple-touch-icon and mask-icon. No SVG `rel=icon` — the kit pixel-fits
the small sizes because browsers do not pixel-fit SVG at 16 px.

Manifest: `/site.webmanifest` (standalone, references `android-chrome-*.png` and `maskable-icon-512x512.png`).

## Fonts

- Variable woff2 for the web: `public/fonts/GeistVariable.woff2`, `GeistMonoVariable.woff2`
- Static woff2 from kit: `public/fonts/Geist-Medium.woff2`, `Geist-Black.woff2`, `GeistMono-Medium.woff2`
- OTF for PDF/stamp pipeline: `src/assets/fonts/Geist-Medium.otf`, `Geist-Black.otf`
- License: SIL OFL 1.1 (`public/fonts/OFL.txt`)

### Type weight hierarchy

| Weight | Use |
|---|---|
| Geist Black (900) | Logo mark and short display lines only — never body or UI |
| Bold (700) | Section headings |
| SemiBold (600) | Sub-headings, labels, nav links |
| Regular (400) | Body text |
| Geist Mono | Technical data, code, product specs |

### Deliberate additions outside the brand kit

- **Geist Pixel Square** — used only for the inspection stamp centre word and rare display accents.
  Never for body text, UI elements, or headings.
- **Dark-theme red text `#FF3B47`** — see Colour section above.

### Label line on product images

The label at the bottom of each target image uses: compact wordmark outline
(`05-product-marking/laser-wordmark-compact-mono.svg`) scaled so its cap height = 1 % of board height,
followed by Geist Mono at 0.86 × that cap height, colour Grey 80 `#333333` at 100 % opacity,
three-space gaps between fields: wordmark, part number, pattern summary, serial + revision.

> **Note:** the kit's own label-line example (`label-line-example.pdf`) still shows the superseded
> part number `300240-2500`. The site's `scripts/brand-overlay.py` config block is the source of truth
> for current part numbers.

## Grey tokens

Kit names (from `calibtools-tokens.css`) are exposed as `--ct-grey-*` CSS custom properties in `global.css`:

| Kit name | Hex | Tailwind token | Role |
|---|---|---|---|
| Grey 80 | `#333333` | `ink-muted` | Body text, product label lines |
| Grey 60 | `#666666` | `ink-soft` | Secondary text, dimension lines |
| Grey 30 | `#B3B3B3` | `line-soft` | Rules, borders, disabled UI |
| Grey 10 | `#E6E6E6` | `line` | Panels, table stripes |
| Grey 05 | `#F2F2F2` | `ground-alt` | Page tints, photo backdrops |

## Claims (src/lib/claims.ts)

Centralised constants — import and use everywhere, never hard-code.

| Constant | Value |
|---|---|
| `FOOTER_LINE` | © 2026 Calib.Tools |
| `LEAD_TIME` | Made to order · ships in 2–3 weeks |
| `SHIPS_FROM` | Ships from the factory |
| `INSPECTION_CLAIM` | Measured before it ships — against a DAkkS-calibrated reference |
| `CERT_CLAIM` | ILAC-MRA certificate from a CNAS-accredited laboratory (add-on) |
| `INCOTERM` | DAP |

### Banned phrases

These must never appear on the website, datasheets or marketing materials:

- Munich, München
- "ships from Germany", "from Germany", "EU stock", "in stock"
- "Inspected in Germany", "German-made", "Made in Germany"
- "verified" (use "measured" instead)
- "certified" (unless part of: "CNAS-accredited", "DAkkS-accredited", "DAkkS-calibrated", "accredited third-party laboratory", or the certificate product description)
- "days delivery" (we ship made-to-order in weeks, not days)
- "Calibrate with Confidence" (superseded tagline — use `TAGLINE` from `src/lib/claims.ts`)
- "Shipped fast" (superseded copy)

Enforced by `scripts/check-prose.mjs` — build fails on a hit.
