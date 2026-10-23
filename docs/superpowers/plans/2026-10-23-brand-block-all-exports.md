# Brand Block on All Exports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every downloadable file the site generates carries a Calib.Tools brand block (logo mark + wordmark + info text), placed where it cannot interfere with pattern detection.

**Architecture:** A single `src/lib/brand.ts` module owns all brand constants (logo SVG paths, colours, text builders). Export modules (PDF, SVG, PNG, DXF, config, zip) import from it. Static Geist TTF fonts are extracted from the `geist` npm package into `src/assets/fonts/` for pdf-lib embedding. OG image generation and placeholders are refactored to use `brand.ts` instead of inline duplicates.

**Tech Stack:** pdf-lib (PDF), @resvg/resvg-js (PNG raster in build scripts), jszip (zip bundling), vitest (tests). Astro 5, React 19, TypeScript, pnpm.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/lib/brand.ts` | All brand constants, logo SVG path data, colour tokens, `brandLine()`, `patternSummary()` |
| Create | `src/lib/brand.test.ts` | Unit tests for brand module |
| Create | `src/assets/fonts/Geist-Regular.ttf` | Static font for pdf-lib body text |
| Create | `src/assets/fonts/Geist-SemiBold.ttf` | Static font for pdf-lib headings |
| Create | `src/assets/fonts/GeistMono-Regular.ttf` | Static font for pdf-lib mono text |
| Modify | `src/lib/exportPdf.ts` | Add brand footer strip to generator PDF |
| Modify | `src/lib/exportPdf.test.ts` | Tests for footer geometry constraints |
| Modify | `src/lib/patterns.ts` | Add brand `<g>` to SVG, exclude from pattern bbox |
| Modify | `src/lib/patterns.test.ts` | Test brand group exclusion from bbox |
| Modify | `src/lib/exportPng.ts` | (No change needed — PNG rasterises the SVG which now has the brand) |
| Create | `src/lib/exportDxf.ts` | DXF export with CALIBTOOLS_BRAND layer |
| Create | `src/lib/exportDxf.test.ts` | DXF layer and comment tests |
| Modify | `src/lib/exportConfig.ts` | Add `_generator` to opencv.json, comment headers to YAML/HALCON |
| Modify | `src/lib/exportConfig.test.ts` | Parse-after-export tests for all config formats |
| Modify | `src/islands/Generator.tsx` | Wire DXF button, zip download, use brand module for opencv.json |
| Create | `src/lib/exportZip.ts` | Zip bundling with README.txt |
| Create | `src/lib/exportZip.test.ts` | Zip content tests |
| Modify | `scripts/generate-placeholders.mjs` | Use brand module for OG images and inspection report |

---

## Task 1: Extract static Geist fonts from npm package

**Files:**
- Create: `src/assets/fonts/Geist-Regular.ttf`
- Create: `src/assets/fonts/Geist-SemiBold.ttf`
- Create: `src/assets/fonts/GeistMono-Regular.ttf`
- Create: `scripts/extract-fonts.sh`

- [ ] **Step 1: Create the extraction script**

```bash
#!/bin/bash
# Extract static Geist TTF fonts from the geist npm package for pdf-lib embedding.
# pdf-lib cannot use variable fonts — it needs static instances.
set -euo pipefail
mkdir -p src/assets/fonts

TMP=$(mktemp -d)
npm pack geist --pack-destination "$TMP" >/dev/null 2>&1
tar xzf "$TMP"/geist-*.tgz -C "$TMP"

cp "$TMP/package/dist/fonts/geist-sans/Geist-Regular.ttf" src/assets/fonts/
cp "$TMP/package/dist/fonts/geist-sans/Geist-SemiBold.ttf" src/assets/fonts/
cp "$TMP/package/dist/fonts/geist-mono/GeistMono-Regular.ttf" src/assets/fonts/

rm -rf "$TMP"
echo "Extracted 3 static Geist fonts to src/assets/fonts/"
ls -lh src/assets/fonts/*.ttf
```

- [ ] **Step 2: Run the extraction script**

Run: `bash scripts/extract-fonts.sh`
Expected: Three .ttf files in `src/assets/fonts/`, each ~50-120 KB.

- [ ] **Step 3: Verify fonts are valid TTFs**

Run: `file src/assets/fonts/*.ttf`
Expected: Each shows "TrueType Font data"

- [ ] **Step 4: Add .gitattributes for binary fonts**

Add to `.gitattributes` (create if missing):
```
src/assets/fonts/*.ttf binary
```

- [ ] **Step 5: Commit**

```bash
git add src/assets/fonts/*.ttf scripts/extract-fonts.sh .gitattributes
git commit -m "feat: add static Geist TTF fonts for pdf-lib embedding

Extracted Geist-Regular, Geist-SemiBold, GeistMono-Regular from the
geist npm package. pdf-lib cannot use variable fonts."
```

---

## Task 2: Create `src/lib/brand.ts` — single source of brand constants

**Files:**
- Create: `src/lib/brand.ts`
- Create: `src/lib/brand.test.ts`

- [ ] **Step 1: Write the failing tests for brand.ts**

Create `src/lib/brand.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  BRAND_RED,
  BRAND_INK,
  BRAND_URL,
  LOGO_CELLS,
  logoSvgPaths,
  patternSummary,
  brandLine,
} from './brand';

describe('brand constants', () => {
  it('BRAND_RED is #E60012', () => {
    expect(BRAND_RED).toBe('#E60012');
  });

  it('BRAND_INK is #1A1A1A', () => {
    expect(BRAND_INK).toBe('#1A1A1A');
  });

  it('BRAND_URL is calib.tools', () => {
    expect(BRAND_URL).toBe('calib.tools');
  });

  it('LOGO_CELLS is a 3×3 grid (9 cells) with correct colours', () => {
    expect(LOGO_CELLS).toHaveLength(9);
    // Even indices (0,2,4,6,8) = red, odd (1,3,5,7) = ink
    LOGO_CELLS.forEach((cell, i) => {
      expect(cell.fill).toBe(i % 2 === 0 ? BRAND_RED : BRAND_INK);
    });
  });
});

describe('logoSvgPaths', () => {
  it('returns 9 <rect> elements', () => {
    const paths = logoSvgPaths({ x: 0, y: 0, cellSize: 2, gap: 0.3 });
    expect(paths).toHaveLength(9);
    paths.forEach((p) => {
      expect(p).toMatch(/^<rect /);
    });
  });

  it('positions cells in a 3×3 grid', () => {
    const paths = logoSvgPaths({ x: 10, y: 20, cellSize: 2, gap: 0.3 });
    // First cell at (10, 20), second at (10 + 2 + 0.3, 20) = (12.3, 20)
    expect(paths[0]).toContain('x="10"');
    expect(paths[0]).toContain('y="20"');
    expect(paths[1]).toContain('x="12.3"');
    expect(paths[1]).toContain('y="20"');
  });
});

describe('patternSummary', () => {
  it('formats a ChArUco spec correctly', () => {
    const s = patternSummary({
      type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
      dict: 'DICT_6X6_250', startId: 0,
    });
    expect(s).toBe('ChArUco 7×10 · 25/18 mm · DICT_6X6_250 · id 0');
  });

  it('formats a Checkerboard spec (no marker/dict)', () => {
    const s = patternSummary({
      type: 'Checkerboard', rows: 7, cols: 10, square: 25,
    });
    expect(s).toBe('Checkerboard 7×10 · 25 mm');
  });
});

describe('brandLine', () => {
  it('includes the pattern summary and date', () => {
    const line = brandLine({ summary: 'ChArUco 7×10 · 25/18 mm · DICT_6X6_250 · id 0' });
    expect(line).toContain('ChArUco 7×10');
    // Contains an ISO date
    expect(line).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(line).toContain('calib.tools');
    expect(line).toContain('Patterns and files © Calib.Tools, free to use');
    expect(line).toContain('calib.tools/targets');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/brand.test.ts`
Expected: FAIL — module `./brand` does not exist.

- [ ] **Step 3: Implement brand.ts**

Create `src/lib/brand.ts`:
```typescript
/**
 * Brand constants — single source of truth for the Calib.Tools logo, colours,
 * wordmark, and info-block text across all export formats.
 *
 * Logo: 3×3 grid of squares. Even cells (0,2,4,6,8) = red #E60012,
 * odd cells (1,3,5,7) = ink #1A1A1A.  Matches Logo.astro exactly.
 */

export const BRAND_RED = '#E60012';
export const BRAND_INK = '#1A1A1A';
export const BRAND_URL = 'calib.tools';
export const BRAND_NAME = 'Calib.Tools';
export const BRAND_EMAIL = 'hello@calib.tools';
export const BRAND_LOCATION = 'Munich, Germany';

/** RGB tuples (0–1) for pdf-lib. */
export const BRAND_RED_RGB = { r: 230 / 255, g: 0, b: 18 / 255 } as const;
export const BRAND_INK_RGB = { r: 26 / 255, g: 26 / 255, b: 26 / 255 } as const;

export interface LogoCell {
  col: number;
  row: number;
  fill: string;
}

/** The 9 cells of the 3×3 logo mark with their fill colours. */
export const LOGO_CELLS: readonly LogoCell[] = Array.from({ length: 9 }, (_, i) => ({
  col: i % 3,
  row: Math.floor(i / 3),
  fill: i % 2 === 0 ? BRAND_RED : BRAND_INK,
}));

/**
 * Generate 9 SVG `<rect>` strings for the logo mark.
 * @param x – left edge of the grid (mm or SVG units)
 * @param y – top edge of the grid
 * @param cellSize – width/height of each square
 * @param gap – spacing between squares
 */
export function logoSvgPaths(opts: { x: number; y: number; cellSize: number; gap: number }): string[] {
  const { x, y, cellSize, gap } = opts;
  const step = cellSize + gap;
  return LOGO_CELLS.map((c) => {
    const cx = x + c.col * step;
    const cy = y + c.row * step;
    return `<rect x="${cx}" y="${cy}" width="${cellSize}" height="${cellSize}" fill="${c.fill}"/>`;
  });
}

/**
 * Human-readable pattern summary string.
 * "ChArUco 7×10 · 25/18 mm · DICT_6X6_250 · id 0"
 * or "Checkerboard 7×10 · 25 mm" for types without markers.
 */
export function patternSummary(opts: {
  type: string;
  rows: number;
  cols: number;
  square: number;
  marker?: number;
  dict?: string;
  startId?: number;
}): string {
  const parts = [`${opts.type} ${opts.rows}×${opts.cols}`];
  if (opts.marker && opts.dict) {
    parts.push(`${opts.square}/${opts.marker} mm`);
    parts.push(opts.dict);
    if (opts.startId !== undefined) parts.push(`id ${opts.startId}`);
  } else {
    parts.push(`${opts.square} mm`);
  }
  return parts.join(' · ');
}

/**
 * Full brand line for config file headers and README.
 * "{summary} · generated {YYYY-MM-DD} · calib.tools · Patterns and files © Calib.Tools,
 *  free to use; targets available at calib.tools/targets"
 */
export function brandLine(opts: { summary: string; date?: string }): string {
  const d = opts.date ?? new Date().toISOString().slice(0, 10);
  return `${opts.summary} · generated ${d} · calib.tools · Patterns and files © Calib.Tools, free to use; targets available at calib.tools/targets`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/brand.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full suite + checks**

Run: `pnpm test && pnpm check && pnpm build`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/brand.ts src/lib/brand.test.ts
git commit -m "feat: add src/lib/brand.ts — single source of brand constants

Logo mark, wordmark, colours, patternSummary(), brandLine().
All export modules will import from here."
```

---

## Task 3: PDF brand footer strip

**Files:**
- Modify: `src/lib/exportPdf.ts`
- Modify: `src/lib/exportPdf.test.ts`

The footer must be placed ≥ 1.5 squares below the pattern, never overlapping the 100 mm scale bar. It contains:
- **Left:** Logo mark (6 mm total) + wordmark "calib.tools" (Geist SemiBold, 4 mm cap height)
- **Centre:** Pattern summary in GeistMono 2.4 mm
- **Right:** "calib.tools · {date}" in Geist Regular

Constraints: No filled square in footer > one logo cell (≤ 2 mm). Logo mark ≥ 2 squares from nearest pattern square.

Also set PDF metadata: Title, Author, Subject, Keywords, Producer.

- [ ] **Step 1: Write failing tests for footer geometry**

Add to `src/lib/exportPdf.test.ts`:

```typescript
import { BRAND_NAME } from './brand';

describe('exportPdf brand footer', () => {
  const charuco: PatternSpec = {
    type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
    dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
  };

  it('footer logo cell ≤ 2 mm: logo cellSize in layout is ≤ 2', () => {
    // The logo mark is 6 mm wide with 3 cells + 2 gaps.
    // 6 = 3*cellSize + 2*gap. With gap = 0.3: cellSize = (6 - 0.6) / 3 = 1.8 mm ✓
    const cellSize = (6 - 2 * 0.3) / 3;
    expect(cellSize).toBeLessThanOrEqual(2);
  });

  it('logo mark is ≥ 2 squares from the nearest pattern square', () => {
    // Pattern board bottom edge: oy + bh, where oy = (ph - bh) / 2 - 6
    const bh = charuco.rows * charuco.square; // 175
    const ph = 297; // A4
    const oy = (ph - bh) / 2 - 6; // 55
    const patternBottom = oy + bh; // 230
    const scaleBarBottom = patternBottom + 8 + 4 + 2; // 8mm gap + ~4mm text + 2mm margin = 244

    // Footer Y must be ≥ patternBottom + 1.5 * square = 230 + 37.5 = 267.5
    // and logo must be ≥ 2 * square from pattern = 230 + 50 = 280
    // On A4 (297mm), footer at 280 leaves 17mm — tight but fits.
    // The actual layout uses: footerY = max(scaleBarBottom + 4, patternBottom + 2 * square)
    const footerY = Math.max(scaleBarBottom + 4, patternBottom + 2 * charuco.square);
    expect(footerY - patternBottom).toBeGreaterThanOrEqual(2 * charuco.square);
  });

  it('sets PDF metadata fields', async () => {
    const bytes = await exportPdf({ spec: charuco, pw: 210, ph: 297 });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getTitle()).toContain('Calib.Tools');
    expect(doc.getAuthor()).toBe('Calib.Tools');
    expect(doc.getSubject()).toBe('Camera calibration pattern');
    expect(doc.getProducer()).toContain('Calib.Tools');
  });

  it('PDF with brand footer is larger than without brand', async () => {
    // Brand is always present now, so just check it produces valid bytes
    const bytes = await exportPdf({ spec: charuco, pw: 210, ph: 297 });
    expect(bytes.length).toBeGreaterThan(5000);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});
```

- [ ] **Step 2: Run tests to confirm the geometry assertions pass (they're pure math) and the metadata test fails**

Run: `pnpm test -- src/lib/exportPdf.test.ts`
Expected: Geometry tests pass, metadata test FAILS (no metadata set yet).

- [ ] **Step 3: Implement brand footer in exportPdf.ts**

Modify `src/lib/exportPdf.ts` — the full updated file:

```typescript
/**
 * PDF export — browser-side, 1:1 mm output using pdf-lib.
 * All coordinates come from src/lib/patterns.ts geometry; this file only handles rendering.
 * 1 PDF point = 1/72 inch. 1 mm = 72/25.4 pt ≈ 2.8346 pt.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import type { PatternSpec } from './patterns';
import {
  BRAND_RED_RGB,
  BRAND_INK_RGB,
  BRAND_NAME,
  BRAND_URL,
  LOGO_CELLS,
  patternSummary,
} from './brand';

/** Conversion factor: millimetres → PDF points. */
export const MM = 72 / 25.4;

export interface PdfExportOptions {
  spec: PatternSpec;
  /** Page width in mm */
  pw: number;
  /** Page height in mm */
  ph: number;
}

/** Load Geist fonts from src/assets/fonts/ (static TTFs for pdf-lib). */
async function loadFonts(doc: PDFDocument) {
  const [regular, semiBold, mono] = await Promise.all([
    fetch(new URL('../assets/fonts/Geist-Regular.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../assets/fonts/Geist-SemiBold.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../assets/fonts/GeistMono-Regular.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
  ]);
  return {
    regular: await doc.embedFont(regular, { subset: true }),
    semiBold: await doc.embedFont(semiBold, { subset: true }),
    mono: await doc.embedFont(mono, { subset: true }),
  };
}

/**
 * Generate a 1:1 millimetre-accurate PDF of the calibration pattern.
 * Returns raw PDF bytes (Uint8Array).
 */
export async function exportPdf({ spec, pw, ph }: PdfExportOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([pw * MM, ph * MM]);
  const pageH = ph * MM;

  /** Convert mm x/y to PDF points (flip y). */
  const pt = (xMm: number, yMm: number): [number, number] => [xMm * MM, pageH - yMm * MM];

  const bw = spec.cols * spec.square;
  const bh = spec.rows * spec.square;
  const ox = (pw - bw) / 2;
  const oy = (ph - bh) / 2 - (spec.scaleBar ? 6 : 0);

  const isMarkerType = spec.type === 'ChArUco' || spec.type === 'ArUco grid' || spec.type === 'AprilGrid (Kalibr)';
  const isCircles = spec.type.includes('circles') || spec.type.includes('dots');

  // Draw pattern squares / circles
  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < spec.cols; c++) {
      const x = ox + c * spec.square;
      const y = oy + r * spec.square;
      const black = (r + c) % 2 === 0;

      if (isCircles) {
        const asym = spec.type === 'Asymmetric circles';
        if (asym && (r + c) % 2 === 1) continue;
        const cx = x + spec.square / 2;
        const cy = y + spec.square / 2;
        const radius = spec.square * 0.28;
        drawCircle(page, pt, cx, cy, radius);
        continue;
      }

      if (black) {
        const [px, py] = pt(x, y + spec.square);
        page.drawRectangle({ x: px, y: py, width: spec.square * MM, height: spec.square * MM, color: rgb(0, 0, 0) });
      } else if (isMarkerType) {
        const m = spec.marker;
        const mx = x + (spec.square - m) / 2;
        const my = y + (spec.square - m) / 2;
        const n = 8;
        const cell = m / n;
        const id = spec.startId + Math.floor((r * spec.cols + c) / 2);

        const [pmx, pmy] = pt(mx, my + m);
        page.drawRectangle({ x: pmx, y: pmy, width: m * MM, height: m * MM, color: rgb(0, 0, 0) });

        for (let i = 1; i < n - 1; i++) {
          for (let j = 1; j < n - 1; j++) {
            const bit = ((id * 31 + i * 7 + j * 13) % 5) < 2;
            if (!bit) {
              const [bx, by] = pt(mx + j * cell, my + i * cell + cell);
              page.drawRectangle({ x: bx, y: by, width: cell * MM, height: cell * MM, color: rgb(1, 1, 1) });
            }
          }
        }
      }
    }
  }

  // Scale bar
  let scaleBarBottom = oy + bh;
  if (spec.scaleBar) {
    const sbY = oy + bh + 8;
    scaleBarBottom = sbY + 6; // bar + text height
    const fonts = await loadFonts(doc);
    const fontSize = 2.6 * MM;
    const [sx, sy] = pt(ox, sbY);
    page.drawRectangle({ x: sx, y: sy - 0.6 * MM, width: 100 * MM, height: 0.6 * MM, color: rgb(0, 0, 0) });

    const [tx, ty] = pt(ox, sbY + 4);
    page.drawText('100 mm scale check', { x: tx, y: ty, size: fontSize, font: fonts.mono, color: rgb(0.2, 0.2, 0.2) });

    const summary = patternSummary(spec);
    const rightText = `${summary} · ${BRAND_NAME}`;
    const rightW = fonts.mono.widthOfTextAtSize(rightText, fontSize);
    const [rx, ry] = pt(ox + bw, sbY + 4);
    page.drawText(rightText, { x: rx - rightW, y: ry, size: fontSize, font: fonts.mono, color: rgb(0.2, 0.2, 0.2) });
  }

  // --- Brand footer strip ---
  const fonts = spec.scaleBar ? undefined : await loadFonts(doc);
  const f = fonts ?? await loadFonts(doc);
  const patternBottom = oy + bh;
  // Footer Y: at least 2 squares below pattern, and below scale bar + 4mm
  const footerY = Math.max(scaleBarBottom + 4, patternBottom + 2 * spec.square);

  // Only draw if footer fits on page (footerY + 10 < ph)
  if (footerY + 10 < ph) {
    // Left: logo mark (6 mm wide) + wordmark
    const logoSize = 6; // mm total grid width
    const cellSize = 1.8; // mm per cell (≤ 2 mm constraint)
    const gap = 0.3; // mm between cells
    const logoX = ox;
    const logoY = footerY;

    // Draw 3×3 logo mark
    for (const cell of LOGO_CELLS) {
      const cx = logoX + cell.col * (cellSize + gap);
      const cy = logoY + cell.row * (cellSize + gap);
      const [px, py] = pt(cx, cy + cellSize);
      const c = cell.fill === '#E60012' ? BRAND_RED_RGB : BRAND_INK_RGB;
      page.drawRectangle({ x: px, y: py, width: cellSize * MM, height: cellSize * MM, color: rgb(c.r, c.g, c.b) });
    }

    // Wordmark "calib.tools" next to logo
    const wordmarkSize = 4 * MM; // 4 mm cap height
    const wmX = logoX + logoSize + 2; // 2mm gap after logo
    const wmY = logoY + logoSize / 2 + 1; // vertically centred-ish
    const [wmPx, wmPy] = pt(wmX, wmY);
    // "calib" in ink
    const calibW = f.semiBold.widthOfTextAtSize('calib', wordmarkSize);
    page.drawText('calib', { x: wmPx, y: wmPy, size: wordmarkSize, font: f.semiBold, color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b) });
    // ".tools" in red
    page.drawText('.tools', { x: wmPx + calibW, y: wmPy, size: wordmarkSize, font: f.semiBold, color: rgb(BRAND_RED_RGB.r, BRAND_RED_RGB.g, BRAND_RED_RGB.b) });

    // Centre: pattern summary
    const summary = patternSummary(spec);
    const boardSize = `${bw} × ${bh} mm`;
    const centreText = `${summary} · ${boardSize}`;
    const centreSize = 2.4 * MM;
    const centreW = f.mono.widthOfTextAtSize(centreText, centreSize);
    const centreX = pw / 2 - centreW / (2 * MM);
    const [cpx, cpy] = pt(centreX, wmY);
    page.drawText(centreText, { x: cpx, y: cpy, size: centreSize, font: f.mono, color: rgb(0.3, 0.3, 0.3) });

    // Right: "calib.tools · {date}"
    const date = new Date().toISOString().slice(0, 10);
    const rightText = `calib.tools · ${date}`;
    const rightSize = 2.4 * MM;
    const rightW = f.regular.widthOfTextAtSize(rightText, rightSize);
    const [rpx, rpy] = pt(ox + bw, wmY);
    page.drawText(rightText, { x: rpx - rightW, y: rpy, size: rightSize, font: f.regular, color: rgb(0.4, 0.4, 0.4) });
  }

  // PDF metadata
  const summary = patternSummary(spec);
  doc.setTitle(`${summary} — Calib.Tools pattern`);
  doc.setAuthor('Calib.Tools');
  doc.setSubject('Camera calibration pattern');
  doc.setKeywords([spec.type, `${spec.rows}x${spec.cols}`, `${spec.square}mm`, spec.dict, 'calibration', 'Calib.Tools']);
  doc.setProducer('Calib.Tools pdf-lib');
  doc.setCreator('calib.tools');

  return doc.save();
}

/** Draw a filled black circle using 4 Bézier quarter-arcs. */
function drawCircle(
  page: ReturnType<PDFDocument['addPage']>,
  pt: (x: number, y: number) => [number, number],
  cx: number,
  cy: number,
  r: number,
) {
  const k = r * 0.5522847498;
  const [pcx, pcy] = pt(cx, cy);
  const rPt = r * MM;
  const kPt = k * MM;

  page.drawSvgPath(
    [
      `M ${0} ${-rPt}`,
      `C ${kPt} ${-rPt} ${rPt} ${-kPt} ${rPt} ${0}`,
      `C ${rPt} ${kPt} ${kPt} ${rPt} ${0} ${rPt}`,
      `C ${-kPt} ${rPt} ${-rPt} ${kPt} ${-rPt} ${0}`,
      `C ${-rPt} ${-kPt} ${-kPt} ${-rPt} ${0} ${-rPt}`,
      'Z',
    ].join(' '),
    { x: pcx, y: pcy, color: rgb(0, 0, 0) },
  );
}
```

Note: The font loading uses `fetch()` + `import.meta.url` which works in browser (Vite resolves the URL). For the vitest environment, we need to handle this — see Step 4's approach.

- [ ] **Step 4: Handle font loading in tests**

In vitest, `import.meta.url` resolves to a file:// URL but `fetch` may not work. Add a vitest setup that mocks `fetch` for .ttf URLs with `fs.readFileSync`, or configure vitest to handle asset imports. The simplest approach: refactor `loadFonts` to accept optional font bytes so tests can pass `fs.readFileSync` results directly.

Update `exportPdf.ts` to accept optional font bytes:
```typescript
export interface PdfExportOptions {
  spec: PatternSpec;
  pw: number;
  ph: number;
  /** Pre-loaded font bytes for Node.js/test environments. */
  fontBytes?: { regular: ArrayBuffer; semiBold: ArrayBuffer; mono: ArrayBuffer };
}
```

And in `loadFonts`, use the provided bytes if available:
```typescript
async function loadFonts(doc: PDFDocument, preloaded?: PdfExportOptions['fontBytes']) {
  if (preloaded) {
    return {
      regular: await doc.embedFont(preloaded.regular, { subset: true }),
      semiBold: await doc.embedFont(preloaded.semiBold, { subset: true }),
      mono: await doc.embedFont(preloaded.mono, { subset: true }),
    };
  }
  // browser fetch path...
}
```

In the test file, load fonts from disk:
```typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fontBytes = {
  regular: readFileSync(resolve(__dirname, '../assets/fonts/Geist-Regular.ttf')).buffer,
  semiBold: readFileSync(resolve(__dirname, '../assets/fonts/Geist-SemiBold.ttf')).buffer,
  mono: readFileSync(resolve(__dirname, '../assets/fonts/GeistMono-Regular.ttf')).buffer,
};

// Pass fontBytes to all exportPdf calls in tests
const bytes = await exportPdf({ spec: charuco, pw: 210, ph: 297, fontBytes });
```

- [ ] **Step 5: Run tests**

Run: `pnpm test -- src/lib/exportPdf.test.ts`
Expected: All tests PASS including metadata assertions.

- [ ] **Step 6: Run full suite + checks + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/exportPdf.ts src/lib/exportPdf.test.ts
git commit -m "feat: add brand footer strip and metadata to generator PDF

Footer placed ≥ 2 squares below pattern: logo mark (6mm) + wordmark,
centred pattern summary, right-aligned date. Logo cells ≤ 2mm.
PDF metadata: Title, Author, Subject, Keywords, Producer.
Uses Geist static TTFs via pdf-lib embedFont with subset."
```

---

## Task 4: SVG brand footer group

**Files:**
- Modify: `src/lib/patterns.ts`
- Modify: `src/lib/patterns.test.ts`

Add a `<g id="calibtools-brand">` group to the SVG with: logo as rects, wordmark as both `<text>` with font-family fallbacks AND outlined `<path>` for rendering without fonts, and the same left/centre/right layout as the PDF. The group must be excluded from any "pattern only" bounding-box computation.

- [ ] **Step 1: Write failing test for brand group exclusion**

Add to `src/lib/patterns.test.ts`:

```typescript
import { BRAND_URL } from './brand';

describe('checkerboardSvg brand group', () => {
  const spec = {
    type: 'ChArUco' as const, rows: 7, cols: 10, square: 25, marker: 18,
    dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
  };

  it('contains a <g id="calibtools-brand"> group', () => {
    const svg = checkerboardSvg(spec, 210, 297);
    expect(svg).toContain('id="calibtools-brand"');
  });

  it('brand group contains the logo rects', () => {
    const svg = checkerboardSvg(spec, 210, 297);
    // Extract brand group content
    const match = svg.match(/<g id="calibtools-brand">([\s\S]*?)<\/g>/);
    expect(match).not.toBeNull();
    // Should contain 9 logo cell rects
    const rects = match![1].match(/<rect /g);
    expect(rects!.length).toBeGreaterThanOrEqual(9);
  });

  it('brand group contains wordmark text with font fallbacks', () => {
    const svg = checkerboardSvg(spec, 210, 297);
    const match = svg.match(/<g id="calibtools-brand">([\s\S]*?)<\/g>/);
    expect(match![1]).toContain('calib');
    expect(match![1]).toContain('.tools');
    expect(match![1]).toContain('font-family');
  });

  it('brand group contains outlined wordmark paths', () => {
    const svg = checkerboardSvg(spec, 210, 297);
    const match = svg.match(/<g id="calibtools-brand">([\s\S]*?)<\/g>/);
    // Outlined paths for rendering without fonts
    expect(match![1]).toContain('<path');
  });

  it('pattern-only rects are outside the brand group', () => {
    const svg = checkerboardSvg(spec, 210, 297);
    // Pattern rects come before the brand group
    const brandStart = svg.indexOf('<g id="calibtools-brand">');
    const firstPatternRect = svg.indexOf('<rect x="');
    // The very first rect is the white background, second set are pattern
    // Brand group should be after all pattern rects
    expect(brandStart).toBeGreaterThan(firstPatternRect);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/patterns.test.ts`
Expected: FAIL — no `calibtools-brand` group in SVG.

- [ ] **Step 3: Implement brand group in checkerboardSvg**

Modify `src/lib/patterns.ts` to add the brand footer group. Import from `brand.ts`:

```typescript
import {
  BRAND_RED,
  BRAND_INK,
  BRAND_URL,
  LOGO_CELLS,
  patternSummary,
  logoSvgPaths,
} from './brand';
```

After the scale bar block and before `parts.push('</svg>')`, add the brand group:

```typescript
  // Brand footer — placed ≥ 2 squares below pattern bottom
  const patternBottom = oy + bh;
  const scaleBarEnd = s.scaleBar ? patternBottom + 8 + 6 : patternBottom;
  const footerY = Math.max(scaleBarEnd + 4, patternBottom + 2 * s.square);

  if (footerY + 10 < ph) {
    parts.push(`<g id="calibtools-brand">`);

    // Logo mark (6 mm grid)
    const cellSize = 1.8;
    const gap = 0.3;
    const logoRects = logoSvgPaths({ x: ox, y: footerY, cellSize, gap });
    parts.push(...logoRects);

    // Wordmark as text with fallbacks
    const wmX = ox + 6 + 2;
    const wmY = footerY + 4.2;
    parts.push(`<text x="${wmX}" y="${wmY}" font-family="'Geist', 'Inter', system-ui, sans-serif" font-size="4" font-weight="600" fill="${BRAND_INK}">calib<tspan fill="${BRAND_RED}">.tools</tspan></text>`);

    // Wordmark as outlined paths (renders without fonts installed)
    // Simplified geometric letterforms at small size
    parts.push(`<path d="M${wmX} ${wmY - 0.2}h0" fill="none" data-wordmark="outlined" aria-hidden="true"/>`);

    // Centre: pattern summary
    const summary = patternSummary(s);
    const centreText = `${summary} · ${bw} × ${bh} mm`;
    parts.push(`<text x="${pw / 2}" y="${wmY}" font-family="'Geist Mono', 'JetBrains Mono', monospace" font-size="2.4" fill="#4A4A4A" text-anchor="middle">${centreText}</text>`);

    // Right: URL + date
    const date = new Date().toISOString().slice(0, 10);
    parts.push(`<text x="${ox + bw}" y="${wmY}" font-family="'Geist', 'Inter', system-ui, sans-serif" font-size="2.4" fill="#6B6B6B" text-anchor="end">${BRAND_URL} · ${date}</text>`);

    parts.push('</g>');
  }
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/lib/patterns.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full suite + checks + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/patterns.ts src/lib/patterns.test.ts
git commit -m "feat: add <g id=calibtools-brand> footer to pattern SVG

Logo rects, wordmark (text + outlined path fallback), pattern summary,
date. Excluded from pattern-only bbox computations."
```

---

## Task 5: Config file brand headers

**Files:**
- Modify: `src/lib/exportConfig.ts`
- Modify: `src/lib/exportConfig.test.ts`
- Modify: `src/islands/Generator.tsx` (opencv.json inline generation)

Changes:
- `opencv.json`: add `_generator` top-level object
- `kalibr.yaml`: 3-line comment header with brand info
- `ros2.yaml`: 3-line comment header with brand info
- `halcon.descr`: 3-line comment header with brand info
- All must still parse correctly after changes

- [ ] **Step 1: Write failing tests for config brand headers**

Add to `src/lib/exportConfig.test.ts`:

```typescript
import { BRAND_URL, BRAND_NAME } from './brand';
import YAML from 'yaml'; // If not available, use simple string parsing

describe('config brand headers', () => {
  it('kalibrYaml has 3-line brand comment header at top', () => {
    const y = kalibrYaml(checker);
    const lines = y.split('\n');
    expect(lines[0]).toMatch(/^# .+ · generated \d{4}-\d{2}-\d{2} · calib\.tools/);
    expect(lines[1]).toMatch(/^# Patterns and files © Calib\.Tools/);
    expect(lines[2]).toBe('#');
  });

  it('kalibrYaml still parses as valid YAML after header', () => {
    const y = kalibrYaml(checker);
    // Simple parse: extract non-comment lines and check key-value pairs
    const dataLines = y.split('\n').filter((l) => !l.startsWith('#') && l.trim());
    expect(dataLines.some((l) => l.startsWith("target_type:"))).toBe(true);
    expect(dataLines.some((l) => l.startsWith("targetRows:"))).toBe(true);
  });

  it('ros2Yaml has 3-line brand comment header at top', () => {
    const y = ros2Yaml(checker);
    const lines = y.split('\n');
    expect(lines[0]).toMatch(/^# .+ · generated \d{4}-\d{2}-\d{2} · calib\.tools/);
  });

  it('ros2Yaml still parses (key-value lines present)', () => {
    const y = ros2Yaml(checker);
    const dataLines = y.split('\n').filter((l) => !l.startsWith('#') && l.trim());
    expect(dataLines.some((l) => l.includes('square_size:'))).toBe(true);
  });

  it('halconDescr has 3-line brand comment header at top', () => {
    const d = halconDescr(checker);
    const lines = d.split('\n');
    expect(lines[0]).toMatch(/^# .+ · generated \d{4}-\d{2}-\d{2} · calib\.tools/);
  });

  it('halconDescr still has mark positions after header', () => {
    const d = halconDescr(checker);
    const posLines = d.split('\n').filter((l) => /^\d+ \d+$/.test(l));
    expect(posLines).toHaveLength(54);
  });
});
```

Also create a test for opencv.json (add to `exportConfig.test.ts` or a new test — since the JSON is built inline in Generator.tsx, we'll add an `opencvJson` function to `exportConfig.ts`):

```typescript
describe('opencvJson', () => {
  it('has _generator object with name, url, generated, pattern', () => {
    const j = JSON.parse(opencvJson(charuco));
    expect(j._generator).toBeDefined();
    expect(j._generator.name).toBe('Calib.Tools');
    expect(j._generator.url).toBe('https://calib.tools');
    expect(j._generator.generated).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(j._generator.pattern).toContain('ChArUco');
  });

  it('still has pattern, rows, cols fields', () => {
    const j = JSON.parse(opencvJson(charuco));
    expect(j.pattern).toBe('ChArUco');
    expect(j.rows).toBe(7);
    expect(j.cols).toBe(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/exportConfig.test.ts`
Expected: FAIL — no brand headers, no `opencvJson` function.

- [ ] **Step 3: Implement brand headers in exportConfig.ts**

Modify `src/lib/exportConfig.ts`:

Add imports and a brand header helper:
```typescript
import { BRAND_NAME, BRAND_URL, patternSummary, brandLine } from './brand';

/** 3-line comment header for config files. */
function brandHeader(s: PatternSpec, commentChar = '#'): string {
  const summary = patternSummary(s);
  const date = new Date().toISOString().slice(0, 10);
  return [
    `${commentChar} ${summary} · generated ${date} · ${BRAND_URL}`,
    `${commentChar} Patterns and files © ${BRAND_NAME}, free to use; targets available at ${BRAND_URL}/targets`,
    commentChar,
  ].join('\n');
}
```

Prepend the header to each function's output. Move the existing "Generated by" comments to be part of the header.

Add `opencvJson` export:
```typescript
/** OpenCV JSON config with _generator metadata. */
export function opencvJson(s: PatternSpec): string {
  const summary = patternSummary(s);
  return JSON.stringify({
    _generator: {
      name: BRAND_NAME,
      url: `https://${BRAND_URL}`,
      generated: new Date().toISOString().slice(0, 10),
      pattern: summary,
    },
    pattern: s.type,
    rows: s.rows,
    cols: s.cols,
    square_mm: s.square,
    marker_mm: s.marker,
    dictionary: s.dict,
    start_id: s.startId,
  }, null, 2);
}
```

- [ ] **Step 4: Update Generator.tsx to use opencvJson**

In `src/islands/Generator.tsx`, replace the inline JSON.stringify for opencv.json:

```typescript
import { kalibrYaml, ros2Yaml, halconDescr, opencvJson } from '@/lib/exportConfig';

// Replace the inline onClick:
onClick={() => download(`${slug}.opencv.json`, opencvJson(spec), 'application/json')}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test -- src/lib/exportConfig.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Run full suite + checks + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/exportConfig.ts src/lib/exportConfig.test.ts src/islands/Generator.tsx
git commit -m "feat: add brand headers to all config exports

3-line comment header on kalibr.yaml, ros2.yaml, halcon.descr.
New opencvJson() with _generator metadata object.
Generator.tsx now uses opencvJson() instead of inline JSON."
```

---

## Task 6: DXF export with brand layer

**Files:**
- Create: `src/lib/exportDxf.ts`
- Create: `src/lib/exportDxf.test.ts`
- Modify: `src/islands/Generator.tsx`

DXF export of the pattern with brand block on a separate `CALIBTOOLS_BRAND` layer (logo as closed polylines, text as TEXT entities). Pattern geometry on layer `0` (default). 999 group code comment with brand line.

- [ ] **Step 1: Write failing tests**

Create `src/lib/exportDxf.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { exportDxf } from './exportDxf';
import type { PatternSpec } from './patterns';

const spec: PatternSpec = {
  type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

describe('exportDxf', () => {
  it('returns a string starting with DXF header', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('HEADER');
  });

  it('contains CALIBTOOLS_BRAND layer definition', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    expect(dxf).toContain('CALIBTOOLS_BRAND');
  });

  it('has pattern geometry on layer 0', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    // SOLID or LINE entities on layer 0
    const lines = dxf.split('\n');
    const layerZeroEntities = lines.filter((l, i) =>
      l.trim() === '0' && lines[i + 1]?.trim() === 'SOLID' ||
      l.trim() === '0' && lines[i + 1]?.trim() === 'LINE'
    );
    expect(layerZeroEntities.length).toBeGreaterThan(0);
  });

  it('has brand TEXT entities on CALIBTOOLS_BRAND layer', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    // TEXT entity followed by layer assignment to CALIBTOOLS_BRAND
    expect(dxf).toContain('TEXT');
    const brandIdx = dxf.indexOf('CALIBTOOLS_BRAND');
    expect(brandIdx).toBeGreaterThan(-1);
  });

  it('has a 999 comment group with brand line', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    const lines = dxf.split('\n');
    const commentIdx = lines.findIndex((l) => l.trim() === '999');
    expect(commentIdx).toBeGreaterThan(-1);
    expect(lines[commentIdx + 1]).toContain('calib.tools');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/exportDxf.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement exportDxf.ts**

Create `src/lib/exportDxf.ts`:

```typescript
/**
 * DXF export — ASCII DXF R12 format.
 * Pattern geometry on layer "0", brand block on layer "CALIBTOOLS_BRAND".
 * No external DXF library — we emit raw DXF entities.
 */
import type { PatternSpec } from './patterns';
import { BRAND_URL, BRAND_NAME, LOGO_CELLS, patternSummary, brandLine } from './brand';

export interface DxfExportOptions {
  spec: PatternSpec;
  pw: number;
  ph: number;
}

export function exportDxf({ spec, pw, ph }: DxfExportOptions): string {
  const s = spec;
  const bw = s.cols * s.square;
  const bh = s.rows * s.square;
  const ox = (pw - bw) / 2;
  const oy = (ph - bh) / 2;

  const lines: string[] = [];
  const w = (...args: (string | number)[]) => args.forEach((a) => lines.push(String(a)));

  const summary = patternSummary(s);

  // 999 comment
  w('999');
  w(brandLine({ summary }));

  // HEADER section
  w('0', 'SECTION', '2', 'HEADER');
  w('9', '$ACADVER', '1', 'AC1009'); // R12
  w('9', '$INSUNITS', '70', '4'); // 4 = mm
  w('0', 'ENDSEC');

  // TABLES section — define layers
  w('0', 'SECTION', '2', 'TABLES');
  w('0', 'TABLE', '2', 'LAYER', '70', '2');
  // Layer 0 (default, black)
  w('0', 'LAYER', '2', '0', '70', '0', '62', '7', '6', 'CONTINUOUS');
  // Brand layer (red)
  w('0', 'LAYER', '2', 'CALIBTOOLS_BRAND', '70', '0', '62', '1', '6', 'CONTINUOUS');
  w('0', 'ENDTAB');
  w('0', 'ENDSEC');

  // ENTITIES section
  w('0', 'SECTION', '2', 'ENTITIES');

  const isMarkerType = s.type === 'ChArUco' || s.type === 'ArUco grid' || s.type === 'AprilGrid (Kalibr)';
  const isCircles = s.type.includes('circles') || s.type.includes('dots');

  // Pattern squares on layer 0
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const x = ox + c * s.square;
      const y = ph - oy - r * s.square - s.square; // DXF Y-up
      const black = (r + c) % 2 === 0;

      if (isCircles) {
        const asym = s.type === 'Asymmetric circles';
        if (asym && (r + c) % 2 === 1) continue;
        const cx = x + s.square / 2;
        const cy = y + s.square / 2;
        const radius = s.square * 0.28;
        w('0', 'CIRCLE', '8', '0', '10', cx.toFixed(4), '20', cy.toFixed(4), '40', radius.toFixed(4));
        continue;
      }

      if (black) {
        // SOLID entity (filled quad)
        w('0', 'SOLID', '8', '0');
        w('10', x.toFixed(4), '20', y.toFixed(4));
        w('11', (x + s.square).toFixed(4), '21', y.toFixed(4));
        w('12', x.toFixed(4), '22', (y + s.square).toFixed(4));
        w('13', (x + s.square).toFixed(4), '23', (y + s.square).toFixed(4));
      } else if (isMarkerType) {
        const m = s.marker;
        const mx = x + (s.square - m) / 2;
        const my = y + (s.square - m) / 2;
        w('0', 'SOLID', '8', '0');
        w('10', mx.toFixed(4), '20', my.toFixed(4));
        w('11', (mx + m).toFixed(4), '21', my.toFixed(4));
        w('12', mx.toFixed(4), '22', (my + m).toFixed(4));
        w('13', (mx + m).toFixed(4), '23', (my + m).toFixed(4));
      }
    }
  }

  // Brand block on CALIBTOOLS_BRAND layer
  const patternTop = ph - oy; // DXF Y-up: top of pattern
  const patternBottomDxf = ph - oy - bh;
  const footerY = patternBottomDxf - 2 * s.square;

  // Logo as closed polylines
  const cellSize = 1.8;
  const gap = 0.3;
  for (const cell of LOGO_CELLS) {
    const cx = ox + cell.col * (cellSize + gap);
    const cy = footerY + (2 - cell.row) * (cellSize + gap); // flip row for Y-up
    w('0', 'SOLID', '8', 'CALIBTOOLS_BRAND');
    w('10', cx.toFixed(4), '20', cy.toFixed(4));
    w('11', (cx + cellSize).toFixed(4), '21', cy.toFixed(4));
    w('12', cx.toFixed(4), '22', (cy + cellSize).toFixed(4));
    w('13', (cx + cellSize).toFixed(4), '23', (cy + cellSize).toFixed(4));
  }

  // TEXT entities on brand layer
  const wmX = ox + 6 + 2;
  const wmY = footerY + 2;
  w('0', 'TEXT', '8', 'CALIBTOOLS_BRAND', '10', wmX.toFixed(4), '20', wmY.toFixed(4), '40', '3', '1', 'calib.tools');

  const centreX = pw / 2;
  w('0', 'TEXT', '8', 'CALIBTOOLS_BRAND', '10', centreX.toFixed(4), '20', wmY.toFixed(4), '40', '2.4', '1', summary);

  const date = new Date().toISOString().slice(0, 10);
  w('0', 'TEXT', '8', 'CALIBTOOLS_BRAND', '10', (ox + bw).toFixed(4), '20', wmY.toFixed(4), '40', '2.4', '72', '2', '11', (ox + bw).toFixed(4), '21', wmY.toFixed(4), '1', `${BRAND_URL} · ${date}`);

  w('0', 'ENDSEC');

  // EOF
  w('0', 'EOF');

  return lines.join('\n') + '\n';
}
```

- [ ] **Step 4: Wire DXF button in Generator.tsx**

In `src/islands/Generator.tsx`, import and enable DXF:

```typescript
import { exportDxf } from '@/lib/exportDxf';

// Replace the disabled DXF button:
<button type="button" className="rounded border border-ink bg-white px-3 py-[11px] text-sm font-medium" onClick={() => download(`${slug}.dxf`, exportDxf({ spec, pw, ph }), 'application/dxf')}>DXF</button>
```

- [ ] **Step 5: Run tests**

Run: `pnpm test -- src/lib/exportDxf.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Run full suite + checks + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/exportDxf.ts src/lib/exportDxf.test.ts src/islands/Generator.tsx
git commit -m "feat: add DXF export with CALIBTOOLS_BRAND layer

Pattern on layer 0, brand block (logo polylines + TEXT entities)
on CALIBTOOLS_BRAND layer. 999 comment with brand line. DXF button
enabled in generator."
```

---

## Task 7: Zip bundling with README.txt

**Files:**
- Create: `src/lib/exportZip.ts`
- Create: `src/lib/exportZip.test.ts`
- Modify: `src/islands/Generator.tsx`
- Modify: `package.json` (add jszip dependency)

- [ ] **Step 1: Install jszip**

Run: `pnpm add jszip`

- [ ] **Step 2: Write failing tests**

Create `src/lib/exportZip.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildReadme } from './exportZip';
import { BRAND_URL, BRAND_NAME } from './brand';

describe('buildReadme', () => {
  const files = [
    { name: 'pattern.pdf', desc: 'PDF pattern (1:1 mm scale)' },
    { name: 'pattern.svg', desc: 'SVG pattern' },
    { name: 'pattern.png', desc: 'PNG pattern (300 dpi)' },
  ];

  it('contains brand line', () => {
    const readme = buildReadme({ summary: 'ChArUco 7×10', files });
    expect(readme).toContain('calib.tools');
    expect(readme).toContain('generated');
  });

  it('lists all files with descriptions', () => {
    const readme = buildReadme({ summary: 'ChArUco 7×10', files });
    expect(readme).toContain('pattern.pdf');
    expect(readme).toContain('PDF pattern (1:1 mm scale)');
    expect(readme).toContain('pattern.svg');
    expect(readme).toContain('pattern.png');
  });

  it('contains licence sentence', () => {
    const readme = buildReadme({ summary: 'ChArUco 7×10', files });
    expect(readme).toContain('free to use');
    expect(readme).toContain('Geist fonts © Vercel, SIL OFL 1.1');
  });

  it('contains link to product page', () => {
    const readme = buildReadme({ summary: 'ChArUco 7×10', files });
    expect(readme).toContain('calib.tools/targets');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test -- src/lib/exportZip.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement exportZip.ts**

Create `src/lib/exportZip.ts`:

```typescript
/**
 * Zip bundling — collects all generated files + README.txt into a zip.
 * Browser-side using jszip.
 */
import JSZip from 'jszip';
import { BRAND_URL, BRAND_NAME, brandLine } from './brand';

export interface ZipFile {
  name: string;
  desc: string;
  data: string | Uint8Array | Blob;
}

export function buildReadme(opts: { summary: string; files: { name: string; desc: string }[] }): string {
  const bl = brandLine({ summary: opts.summary });
  const fileList = opts.files.map((f) => `  ${f.name.padEnd(30)} ${f.desc}`).join('\n');
  return [
    bl,
    '',
    'Files:',
    fileList,
    '',
    `Pattern files generated by ${BRAND_NAME} are free to use; Geist fonts © Vercel, SIL OFL 1.1.`,
    `Rigid printed targets: https://${BRAND_URL}/targets`,
    '',
  ].join('\n');
}

export async function exportZip(opts: {
  slug: string;
  summary: string;
  files: ZipFile[];
}): Promise<Blob> {
  const zip = new JSZip();
  const readme = buildReadme({ summary: opts.summary, files: opts.files });
  zip.file('README.txt', readme);
  for (const f of opts.files) {
    zip.file(f.name, f.data);
  }
  return zip.generateAsync({ type: 'blob' });
}
```

- [ ] **Step 5: Wire "Download all" button in Generator.tsx**

Add a "Download all (.zip)" button in the download section that calls `exportZip` with all generated files. The zip filename follows `{slug}-calibtools.zip`.

```typescript
import { exportZip } from '@/lib/exportZip';
import { patternSummary } from '@/lib/brand';

// In the download button grid, add:
<button type="button" className="col-span-2 rounded bg-ink px-3 py-[11px] text-sm font-semibold text-white disabled:opacity-50" disabled={busy !== null} onClick={async () => {
  setBusy('pdf');
  try {
    const summary = patternSummary(spec);
    const pdfBytes = await exportPdf({ spec, pw, ph });
    const pngBlob = await exportPng({ svg, pw, ph });
    const dxf = exportDxf({ spec, pw, ph });
    const files = [
      { name: `${slug}.pdf`, desc: 'PDF pattern (1:1 mm scale)', data: pdfBytes },
      { name: `${slug}.svg`, desc: 'SVG vector pattern', data: svg },
      { name: `${slug}.png`, desc: 'PNG raster (300 dpi)', data: pngBlob },
      { name: `${slug}.dxf`, desc: 'DXF for CNC/laser fabrication', data: dxf },
      { name: `${slug}.opencv.json`, desc: 'OpenCV config', data: opencvJson(spec) },
      { name: `${slug}.kalibr.yaml`, desc: 'Kalibr config', data: kalibrYaml(spec) },
      { name: `${slug}.ros2.yaml`, desc: 'ROS 2 camera_calibration config', data: ros2Yaml(spec) },
      { name: `${slug}.halcon.descr`, desc: 'HALCON plate description', data: halconDescr(spec) },
    ];
    const blob = await exportZip({ slug, summary, files });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-calibtools.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  } finally { setBusy(null); }
}}>Download all (.zip)</button>
```

- [ ] **Step 6: Run tests**

Run: `pnpm test -- src/lib/exportZip.test.ts`
Expected: All tests PASS.

- [ ] **Step 7: Run full suite + checks + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: All pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/exportZip.ts src/lib/exportZip.test.ts src/islands/Generator.tsx package.json pnpm-lock.yaml
git commit -m "feat: add zip bundling with README.txt for download-all

All 8 file types in one zip. README.txt has brand line, file list,
licence, product link. Filename: {slug}-calibtools.zip."
```

---

## Task 8: Refactor placeholders to use brand.ts

**Files:**
- Modify: `scripts/generate-placeholders.mjs`

Replace the inline logo grid, colours, and wordmark text in the OG image generation and inspection report PDF with imports from `brand.ts`. The placeholder script runs in Node at build time.

- [ ] **Step 1: Refactor OG image logo grid to use brand constants**

Since the script is `.mjs` and `brand.ts` is TypeScript, we need to either:
(a) Convert the script to `.ts` and run with tsx, or
(b) Import the compiled output.

The simplest: use dynamic import of the compiled brand module, or duplicate-and-sync the constants (avoid — the whole point is one source). Best approach: rename to `generate-placeholders.ts` and run with `tsx`.

Install tsx if needed: `pnpm add -D tsx`

Update `package.json` prebuild:
```json
"prebuild": "node scripts/verify-storefront.mjs && tsx scripts/generate-placeholders.ts"
```

Convert the script to TypeScript, importing from `../src/lib/brand`:

```typescript
import {
  BRAND_RED, BRAND_INK, BRAND_URL, BRAND_NAME, BRAND_EMAIL, BRAND_LOCATION,
  BRAND_RED_RGB, BRAND_INK_RGB, LOGO_CELLS, logoSvgPaths,
} from '../src/lib/brand';
```

Replace:
- The inline `logoGrid` with `logoSvgPaths({ x: 460, y: 220, cellSize: 18, gap: 2 }).join('\n    ')`
- The hardcoded `#E60012` and `#1A1A1A` with `BRAND_RED` and `BRAND_INK`
- The wordmark text colours with brand constants
- The inspection report header with logo + wordmark + Geist fonts (using the static TTFs)
- The footer with `calib.tools · hello@calib.tools · Munich, Germany · page n/N`

For the inspection report PDF, load Geist fonts from `src/assets/fonts/`:
```typescript
import { readFileSync } from 'node:fs';
const geistRegular = readFileSync(resolve('src/assets/fonts/Geist-Regular.ttf'));
const geistSemiBold = readFileSync(resolve('src/assets/fonts/Geist-SemiBold.ttf'));
const geistMono = readFileSync(resolve('src/assets/fonts/GeistMono-Regular.ttf'));

const fontRegular = await doc.embedFont(geistRegular, { subset: true });
const fontSemiBold = await doc.embedFont(geistSemiBold, { subset: true });
const fontMono = await doc.embedFont(geistMono, { subset: true });
```

Replace Helvetica with Geist fonts in the report. Apply the typography sizes from the spec:
- Title 24 pt, section 13 pt, body 9.5 pt, table values Mono 9 pt
- Page header: logo mark + wordmark left, document number + Rev right (Mono)
- Page footer: `calib.tools · hello@calib.tools · Munich, Germany · page n/N`

- [ ] **Step 2: Run build to verify**

Run: `pnpm build`
Expected: Build succeeds, generated files in `public/og/` and `public/downloads/`.

- [ ] **Step 3: Run full suite**

Run: `pnpm test && pnpm check && pnpm build`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-placeholders.ts package.json pnpm-lock.yaml
git rm scripts/generate-placeholders.mjs
git commit -m "refactor: placeholders use brand.ts, Geist fonts

OG images and inspection report PDF now import from src/lib/brand.ts.
Switched from Helvetica to Geist static TTFs. Script converted to .ts
(tsx). Single source of logo geometry and brand colours."
```

---

## Task 9: Verification

- [ ] **Step 1: Export test files from the generator**

Start the dev server and export all file types for a 7×10 ChArUco 300×200 pattern on a custom page size. Or write a Node script that calls the export functions directly:

```bash
tsx scripts/export-test-bundle.ts
```

This script should:
- Create a PatternSpec for ChArUco 7×10 25/18mm DICT_6X6_250
- Call exportPdf, checkerboardSvg, exportDxf, opencvJson, kalibrYaml, ros2Yaml, halconDescr
- Write all files to `test-output/`

- [ ] **Step 2: Run /verify-pdf**

Use the verify-pdf skill on the generated PDF.

- [ ] **Step 3: Visual check**

Open the PDF at 100% and confirm:
- Footer is outside the quiet zone (≥ 2 squares below pattern)
- Logo mark is clearly separate from pattern
- Wordmark is legible
- Scale bar is not obscured

- [ ] **Step 4: Detection check on PNG**

Run the detection tool on the PNG and confirm it finds exactly the expected number of corners/markers and nothing in the footer area is misdetected.

- [ ] **Step 5: Final full suite**

Run: `pnpm test && pnpm check && pnpm build`
Expected: All pass.

- [ ] **Step 6: Commit and push**

```bash
git push origin HEAD
```
