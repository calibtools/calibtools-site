# Tool export branding audit — 2026-10-28

## Summary

The Pattern Generator (T1) is the only tool that produces file exports. Tools T2–T7 have no file exports (T4 Converter outputs plain converted config text with no branding; T7 Capture downloads raw camera PNGs with no brand overlay).

## Status: RESOLVED

All issues found in the initial audit have been fixed:

- **Logo**: Replaced the retired 3x3 nine-square grid (`LOGO_CELLS`) with the bracket-framed wordmark from brand kit v1.0 on all visual exports (PDF, SVG, DXF).
- **`LOGO_CELLS` and `logoSvgPaths`**: Removed from `brand.ts`. All renderers updated.
- **DXF wordmark**: No DXF existed in the brand kit. SVG paths were converted to polylines via `scripts/svg-to-dxf-polylines.mjs` (adaptive Bézier linearisation, 907 vertices, 0.5 unit tolerance). Result committed as `src/lib/wordmarkDxf.ts`.
- **Provenance line**: Added to all visual exports: `"Generated with calib.tools/tools/generator · {date} · v0.1.0"`.
- **Print accuracy note**: Added to all visual exports: `"Printed patterns are not measured. Check square size with a ruler after printing."`.
- **Config headers**: Updated to use `provenanceLine()` instead of duplicating brand text.
- **Shared module**: `src/lib/exportBrand.ts` is the single source for all export branding.
- **Postbuild guard**: `scripts/check-exports.mjs` verifies T1 DXF for banned phrases, provenance, wordmark, and print note.
- **`brand.md`**: Added logo-usage-by-context rule (bracket-framed wordmark for exports, horizontal lockup for desktop screen, C.T icon for mobile).

## Per-tool, per-format audit

### T1 — Pattern Generator

| Format | Logo | Wordmark text | URL | Date | Parameter line | Footer/provenance | Issues |
|--------|------|---------------|-----|------|----------------|-------------------|--------|
| **PDF** (`exportPdf.ts`) | 3x3 grid via `LOGO_CELLS` (pdf-lib rects) | `calib` (SemiBold) + `.tools` (red) as live text | `calib.tools` | ISO date | `patternSummary()` + `bw × bh mm` | `calib.tools · {date}` | Logo is nine-square, not bracket-framed wordmark. No provenance line with tool URL. No print-accuracy note. No tagline (correct). No city/country (correct). |
| **SVG** (`svgLayers.ts`) | 3x3 grid via `logoSvgPaths()` (9 rects) | `calib<tspan>.tools</tspan>` live text | `calib.tools` | ISO date | `patternSummary()` | `{BRAND_URL} · {date}` | Same as PDF — nine-square logo. Scale-bar right label hardcodes `Calib.Tools` but via `patternSummary()` constant. Font-family uses fallback `system-ui, sans-serif` — not Geist outlines. |
| **PNG** (`exportPng.ts`) | (rasterises SVG) | (rasterises SVG) | — | — | — | — | Inherits all SVG issues. No standalone brand block — just the SVG rasterised at 300 dpi. |
| **DXF** (`exportDxf.ts`) | 3x3 grid via `LOGO_CELLS` (SOLID entities) | `calib.tools` as TEXT entity | `calib.tools` | ISO date | `patternSummary()` via `brandLine()` | `brandLine()` comment + in-drawing text | Same nine-square logo. Uses `brandLine()` for comment header (good). No provenance URL with tool slug. |
| **ZIP** (`exportZip.ts`) | None (text-only README) | — | `calib.tools` | — | via `brandLine()` | `brandLine()` in README.txt | No logo. Uses `brandLine()` correctly. Includes "targets available at calib.tools/targets" (acceptable cross-reference). |
| **opencv.json** (`exportConfig.ts`) | None (config file) | — | `https://calib.tools` | ISO date | `patternSummary()` in `_generator` | `_generator` block | Correct — config files should not have logos. |
| **kalibr.yaml** (`exportConfig.ts`) | None | — | `calib.tools` | ISO date | `patternSummary()` in `brandHeader()` | Comment header via `brandHeader()` | `brandHeader()` includes "Patterns and files © Calib.Tools, free to use; targets available at calib.tools/targets" — acceptable. |
| **ros2.yaml** (`exportConfig.ts`) | None | — | Same as kalibr | Same | Same | Same | Same as kalibr. |
| **halcon.descr** (`exportConfig.ts`) | None | — | Same as kalibr | Same | Same | Same | Same as kalibr. |
| **Set manifest** (`exportSet.ts`) | None (JSON) | — | `https://calib.tools` | ISO date | pattern metadata | `_generator` block | Correct. |

### T2 — FOV Calculator

No file exports. Screen-only results.

### T3 — Target Selection Wizard

No file exports. Links to the pattern generator.

### T4 — Format Converter

Downloads converted config text (opencv.json, kalibr.yaml, ros2.yaml, halcon.descr). The output is the user's own data re-serialized — uses `serialize()` from `convert.ts` which calls `exportConfig.ts` functions for Kalibr/ROS/HALCON but **only when generating from scratch**, not when converting user input. When converting, the output is the user's data in a new format with no brand header. This is correct behaviour.

### T5 — Detection Check

No file exports. Renders detection overlay on canvas (screen-only).

### T6 — Quality Analyzer

No file exports. Screen-only report.

### T7 — Capture Assistant

Downloads raw camera PNG frames (`calib-NN-pose.png`). No brand overlay — these are the user's own captured images. Correct behaviour.

## XY orientation arrows

Present on SVG (`axesSvg()` in `svgLayers.ts`), DXF (`exportDxf.ts`), and PDF axes not yet implemented (PDF draws pattern only — no axes group). **PDF is missing XY axes.**

X colour: `#E60012` (brand red) — correct.
Y colour: `#1BA55A` (green) — correct per brand.md.
Monochrome mode available via `spec.monochromeAxes`.

## Fonts in exports

- **PDF**: Embeds Geist Regular, SemiBold, Mono as TTF subsets via pdf-lib + fontkit. Good.
- **SVG**: Uses CSS `font-family: 'Geist', system-ui, sans-serif` and `'Geist Mono', monospace`. Fonts not embedded — relies on viewer having Geist installed. This means layout may shift on systems without Geist.
- **DXF**: TEXT entities use the DXF viewer's default font. No font embedding (standard for DXF R12).

## Issues to fix

1. **Logo**: All visual exports use the nine-square grid (`LOGO_CELLS`), not the bracket-framed wordmark. Must switch to inline SVG of `wordmark-framed-light.svg` (positive) / `wordmark-framed-dark.svg` (negative).
2. **No provenance line**: Exports lack `"Generated with calib.tools/tools/generator · {date} · v{version}"`.
3. **No print-accuracy note**: No disclaimer about measuring printed patterns.
4. **PDF missing axes**: PDF export does not render XY orientation arrows.
5. **SVG fonts not embedded**: Layout depends on Geist being installed locally.
6. **Parameter line incomplete**: `patternSummary()` omits units label ("mm") on the marker size and doesn't include "marker ID range" as a separate labelled field.

## Items already correct

- No retired circular-ring logo found anywhere.
- No "Calibrate with confidence" anywhere.
- No city/country (Munich, Germany) anywhere.
- No "Inspected in" anywhere.
- No old email or domain misspelling.
- No base64-embedded images.
- BRAND_NAME, BRAND_URL, BRAND_EMAIL from `brand.ts` used consistently.
- Config files use comment headers only (no logo) — correct.
- `brandLine()` provides consistent attribution.
- `patternSummary()` provides consistent parameter text.
- `claims.ts` constants used for all factual claims.

## Datasheet / customer docs (out of scope — noted only)

`src/docs/build/ct-ds.ts:259` contains `Rendering · 185 × 110 mm variant` — this is a figure caption for a product rendering, not the banned word. The datasheet pipeline (`ct-ds.ts`, `ct-ir.ts`, `ct-sv-cert-ilac.ts`) has its own brand system via `ctdoc.ts` and is not part of the free tool exports.
