# Calib.Tools brand assets

Brand kit source: `~/Documents/Calib.Tools/05-品牌与设计/Logo/calibtools-brand-kit/`

## Logo system (v1.0, October 2025)

The previous circular ring logo (`logo-circle-light.svg`, `logo-circle-dark.svg`) is retired.
The new system has four marks, each in positive (light bg) and negative (dark bg) variants:

| Mark | File in `public/brand/` | Use |
|---|---|---|
| Wordmark framed | `wordmark-framed-light.svg` (brand kit `calibtools-wordmark-framed-positive.svg`) / `wordmark-framed-dark.svg` (`calibtools-wordmark-framed-negative.svg`); on the site the **™ versions** `wordmark-framed-light-tm.svg` / `wordmark-framed-dark-tm.svg` | **The only logo in the site header and footer**, desktop and mobile. Positive on light grounds, negative on dark grounds; red dot in both; always with ™. Header h 40 px desktop / 32 px mobile, footer h 28 px. Also documents |
| C.T icon | `/favicon.svg` (brand kit `calibtools-icon-positive.svg`) and the favicon/app-icon PNGs derived from it | **Favicon only.** Not used in the header, footer or page content |
| Wordmark compact | `wordmark-compact-light.svg` / `wordmark-compact-dark.svg` | Product label lines on boards and print exports, inline |
| Horizontal lockup | `lockup-light.svg` / `lockup-dark.svg` | Retired from the site (2026-11-08); kept in the kit for third-party listings only if asked |

Never use the mono-black or mono-white framed wordmark on the site: the dot stays red.

**™**: the site logo carries ™ (Geist SemiBold, outlined, letter color, cap height 36 % of the wordmark cap height, top-aligned with the frame, right of the top-right bracket). The `-tm` files are generated from the brand-kit originals by `pnpm exec tsx scripts/brand-tm.ts`; the originals stay untouched. Switch to ® only after the registration is granted.

SVGs have non-standard viewBoxes (negative origins). Size only with CSS `height`; never set both `width` and `height`.

### Logo usage by context

| Context | Mark |
|---|---|
| **Exports and print** (tool exports, datasheets, all customer documents) | Framed wordmark at \u2265 25 mm; where the brand block must be narrower, the compact wordmark at \u2265 20 mm |
| **Screen — header and footer** (desktop and mobile) | Framed wordmark, positive or negative |
| **Browser tab, bookmarks, home-screen icon** | C.T icon (favicon set) |

### Clear-space rules

- Around lockups/wordmarks: clear space = cap-height H of the word "CALIB" in that mark.
- Around the C.T icon: clear space = 0.25 × icon diameter D.
- Minimum rendered widths: framed wordmark 120 px, compact wordmark 90 px, icon 16 px (favicon).

## Color — red accent rule

Red `#E60012` is used **only as an accent** — roughly 1 % of any layout: the square point, the X-axis arrow,
CTA buttons, and small highlights. It is never used as a background fill, full-width stripe, body-text color,
or large typographic element. On the home page only the two CTA buttons may use red as a background.
Source: `06-colours/colours.json` in the brand kit.

### Color token usage by surface

| Token | Hex | Use |
|---|---|---|
| `brand` (`--color-brand`) | #E60012 | CTA button fills; large headings (≥ 24 px, or ≥ 19 px bold); decorative accents; icon tints on any surface |
| `brand-dark` (`--color-brand-dark`) | #B3000E | Light surfaces only: table headers, hover states on light bg, prose links. **Never on a dark background.** |
| `brand-on-dark` (`--color-brand-on-dark`) | #FF4D4D | Dark surfaces (`#0A0A0A`, `#111111`, `#1A1A1A`): normal-size red text (< 24 px / < 19 px bold). WCAG ratios: 6.05 on #0A0A0A, 5.77 on #111111, 5.32 on #1A1A1A — all ≥ 4.5:1. |
| `brand-text` (`--color-brand-text`) | #E60012 light / #FF3B47 dark | Eyebrow labels; theme-aware — resolves to `brand` on light, a lighter variant on dark. |

**Rule:** On dark surfaces, red text at normal size uses `text-brand-on-dark`. `#E60012` (`text-brand`) is
reserved for large headings (≥ 24 px, or ≥ 19 px bold) and for button fills where contrast is white-on-red.
`#B3000E` (`text-brand-dark`) is for light surfaces only.

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

- **Geist Pixel Square** — used only for the inspection stamp center word and rare display accents.
  Never for body text, UI elements, or headings.
- **Dark-theme red text `#FF3B47`** — see Color section above.

### Label line on product images

The label at the bottom of each target image uses: compact wordmark outline
(`05-product-marking/laser-wordmark-compact-mono.svg`) scaled so its cap height = 1 % of board height,
followed by Geist Mono at 0.86 × that cap height, color Gray 80 `#333333` at 100 % opacity,
three-space gaps between fields: wordmark, part number, pattern summary, serial + revision.

> **Note:** the kit's own label-line example (`label-line-example.pdf`) still shows the superseded
> part number `300240-2500`. The site's `scripts/brand-overlay.py` config block is the source of truth
> for current part numbers.

## Gray tokens

Kit names (from `calibtools-tokens.css`) are exposed as `--ct-grey-*` CSS custom properties in `global.css`:

| Kit name | Hex | Tailwind token | Role |
|---|---|---|---|
| Gray 80 | `#333333` | `ink-muted` | Body text, product label lines |
| Gray 60 | `#666666` | `ink-soft` | Secondary text, dimension lines |
| Gray 30 | `#B3B3B3` | `line-soft` | Rules, borders, disabled UI |
| Gray 10 | `#E6E6E6` | `line` | Panels, table stripes |
| Gray 05 | `#F2F2F2` | `ground-alt` | Page tints, photo backdrops |

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
- "DAkkS certificate", "DAkkS-certified", "certified by DAkkS" (the certificate is issued by a CNAS lab, not by DAkkS; our golden sample is DAkkS-calibrated)
- "lab-grade" (vague, unverifiable)
- "factor 10" (use the exact ratio from `ceramicVsCompositeRatio()` instead)

Enforced by `scripts/check-prose.mjs` — build fails on a hit.
