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

## Colour — red accent rule

Red `#E60012` is used **only as an accent**: the square point, the X-axis arrow, and small highlights.
It is never used as a background fill, full-width stripe, or large typographic element.
Source: `06-colours/colours.json` in the brand kit.

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

## Grey tokens

Kit names (from `calibtools-tokens.css`) are exposed as `--ct-grey-*` CSS custom properties in `global.css`:

| Kit name | Hex | Tailwind token | Role |
|---|---|---|---|
| Grey 80 | `#333333` | `ink-muted` | Body text, product label lines |
| Grey 60 | `#666666` | `ink-soft` | Secondary text, dimension lines |
| Grey 30 | `#B3B3B3` | `line-soft` | Rules, borders, disabled UI |
| Grey 10 | `#E6E6E6` | `line` | Panels, table stripes |
| Grey 05 | `#F2F2F2` | `ground-alt` | Page tints, photo backdrops |
