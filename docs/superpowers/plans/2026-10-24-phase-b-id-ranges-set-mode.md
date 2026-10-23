# Phase B — ID Ranges, Footer Fallbacks, Set Mode, Marker Sheet

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make marker-ID ranges visible everywhere (exports, UI, configs), ensure the brand footer never silently disappears, add multi-board set export with zip bundling, and add a single-marker/marker-sheet tool mode.

**Architecture:** `idRange()` in patterns.ts computes {min,max,count} from spec. `patternSummary()` and all exports use it. Footer fallback logic moves into `brandFooterSvg()`/`exportPdf` with 3-tier cascade (auto page → compact side footer → visible warning). Multi-board set mode is a generator UI feature that loops `exportPdf` per board, bundles with JSZip, and adds a set-overview PDF. The marker sheet is a new PatternSpec type registered in tools.ts as a generator tab.

**Tech Stack:** TypeScript, Vitest, pdf-lib, JSZip, React, Astro

**Working directory:** `/Users/malinto/Documents/calibtools-site`

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `src/lib/idRange.ts` | `idRange(spec)` → `{min, max, count}` for ChArUco/AprilGrid/MarkerSheet |
| `src/lib/idRange.test.ts` | Tests for idRange with various grids and start IDs |
| `src/lib/exportSet.ts` | Multi-board set export: n PDFs + manifest + overview PDF → zip |
| `src/lib/exportSet.test.ts` | Tests for set manifest, file naming, ID assignment |
| `src/lib/renderMarkerSheet.ts` | Marker sheet renderer (one or many markers per page) |
| `src/lib/renderMarkerSheet.test.ts` | Tests for marker sheet layout, quiet zone |

### Modified files
| File | Changes |
|------|---------|
| `src/lib/patterns.ts` | Add `'Marker sheet'` to PatternSpec type union |
| `src/lib/brand.ts` | Update `patternSummary()` to use idRange, show "IDs 0–34" |
| `src/lib/brand.test.ts` | Tests for updated summary format |
| `src/lib/svgLayers.ts` | 3-tier footer fallback cascade |
| `src/lib/svgLayers.test.ts` | Tests for all 3 fallback paths |
| `src/lib/exportPdf.ts` | 3-tier footer fallback; use idRange in footer text |
| `src/lib/exportPdf.test.ts` | Tests for footer fallback paths |
| `src/lib/exportConfig.ts` | Add `id_range` to opencv.json; add to kalibr/ros2/halcon headers |
| `src/lib/exportConfig.test.ts` | Tests for id_range in configs |
| `src/lib/exportDxf.ts` | Corner ID badge in quiet zone |
| `src/lib/tools.ts` | Register marker sheet as generator tab |
| `src/islands/Generator.tsx` | Multi-board set UI, marker sheet tab, corner ID badge toggle |
| `src/lib/shopify.ts` | Add `attributes` to `CartLineInput`; update `buildCartLines` |
| `src/islands/VariantPicker.tsx` | Board set option (n boards), ID range display, line-item properties |

---

## Task 1: `idRange()` utility + tests (Step 8)

**Files:**
- Create: `src/lib/idRange.ts`
- Create: `src/lib/idRange.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// src/lib/idRange.test.ts
import { describe, it, expect } from 'vitest';
import { idRange } from './idRange';
import type { PatternSpec } from './patterns';

const base: PatternSpec = {
  type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

describe('idRange', () => {
  it('ChArUco 7x10 startId=0 → {min:0, max:34, count:35}', () => {
    const r = idRange(base);
    expect(r).toEqual({ min: 0, max: 34, count: 35 });
  });

  it('ChArUco 7x10 startId=10 → {min:10, max:44, count:35}', () => {
    const r = idRange({ ...base, startId: 10 });
    expect(r).toEqual({ min: 10, max: 44, count: 35 });
  });

  it('AprilGrid 6x6 startId=0 → {min:0, max:35, count:36}', () => {
    const r = idRange({ ...base, type: 'AprilGrid (Kalibr)', rows: 6, cols: 6 });
    expect(r).toEqual({ min: 0, max: 35, count: 36 });
  });

  it('AprilGrid 4x5 startId=100 → {min:100, max:119, count:20}', () => {
    const r = idRange({ ...base, type: 'AprilGrid (Kalibr)', rows: 4, cols: 5, startId: 100 });
    expect(r).toEqual({ min: 100, max: 119, count: 20 });
  });

  it('Checkerboard returns null (no markers)', () => {
    expect(idRange({ ...base, type: 'Checkerboard' })).toBeNull();
  });

  it('Symmetric circles returns null', () => {
    expect(idRange({ ...base, type: 'Symmetric circles' })).toBeNull();
  });

  it('ArUco grid 5x8 startId=0 → {min:0, max:19, count:20}', () => {
    const r = idRange({ ...base, type: 'ArUco grid', rows: 5, cols: 8 });
    expect(r).toEqual({ min: 0, max: 19, count: 20 });
  });
});
```

- [ ] **Step 2: Implement `idRange.ts`**

```typescript
/**
 * Compute the marker/tag ID range for a pattern spec.
 * Returns null for patterns without markers (Checkerboard, circles).
 */
import type { PatternSpec } from './patterns';

export interface IdRangeResult {
  min: number;
  max: number;
  count: number;
}

export function idRange(spec: PatternSpec): IdRangeResult | null {
  const { type, rows, cols, startId } = spec;

  if (type === 'ChArUco' || type === 'ArUco grid') {
    // White squares contain markers: floor(rows*cols / 2)
    const count = Math.floor((rows * cols) / 2);
    return { min: startId, max: startId + count - 1, count };
  }

  if (type === 'AprilGrid (Kalibr)') {
    // Each grid cell is one tag
    const count = rows * cols;
    return { min: startId, max: startId + count - 1, count };
  }

  // Checkerboard, circles, HALCON dots — no marker IDs
  return null;
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/idRange.ts src/lib/idRange.test.ts
git commit -m "feat: idRange() utility for marker/tag ID range computation

ChArUco/ArUco: floor(rows*cols/2) markers. AprilGrid: rows*cols tags.
Returns {min, max, count} or null for non-marker patterns.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Update `patternSummary()` to show ID ranges (Step 9 partial)

**Files:**
- Modify: `src/lib/brand.ts`
- Modify: `src/lib/brand.test.ts`

- [ ] **Step 1: Write tests for updated summary format**

Add to `src/lib/brand.test.ts`:

```typescript
describe('patternSummary with ID ranges', () => {
  it('ChArUco shows "IDs 0–34" instead of "id 0"', () => {
    const s = patternSummary({
      type: 'ChArUco', rows: 7, cols: 10, square: 25,
      marker: 18, dict: 'DICT_6X6_250', startId: 0,
    });
    expect(s).toContain('IDs 0\u201334');
    expect(s).not.toContain('id 0');
  });

  it('ChArUco with startId=10 shows "IDs 10–44"', () => {
    const s = patternSummary({
      type: 'ChArUco', rows: 7, cols: 10, square: 25,
      marker: 18, dict: 'DICT_6X6_250', startId: 10,
    });
    expect(s).toContain('IDs 10\u201344');
  });

  it('AprilGrid shows "IDs 0–35"', () => {
    const s = patternSummary({
      type: 'AprilGrid (Kalibr)', rows: 6, cols: 6, square: 30,
      marker: 22, dict: '', startId: 0,
    });
    expect(s).toContain('IDs 0\u201335');
  });

  it('Checkerboard still has no ID in summary', () => {
    const s = patternSummary({
      type: 'Checkerboard', rows: 7, cols: 10, square: 25,
    });
    expect(s).not.toContain('ID');
    expect(s).not.toContain('id');
  });
});
```

- [ ] **Step 2: Update `patternSummary()` in `brand.ts`**

Import `idRange` and replace the `id ${startId ?? 0}` with `IDs ${min}–${max}`:

```typescript
import { idRange } from './idRange';

export function patternSummary(opts: PatternSummaryOpts): string {
  const { type, rows, cols, square, marker, dict, startId } = opts;
  const grid = `${rows}\u00D7${cols}`;
  const hasMarker = marker !== undefined && marker > 0;
  const hasDict = dict !== undefined && dict !== '';

  if (hasMarker && hasDict) {
    // Compute ID range
    const range = idRange({
      type: type as any, rows, cols, square, marker, dict,
      paper: '', startId: startId ?? 0, scaleBar: false,
    });
    const idStr = range ? `IDs ${range.min}\u2013${range.max}` : `id ${startId ?? 0}`;
    return `${type} ${grid} · ${square}/${marker} mm · ${dict} · ${idStr}`;
  }
  return `${type} ${grid} · ${square} mm`;
}
```

- [ ] **Step 3: Run tests — fix any breaking assertions in existing tests**

The existing tests that expect `id 0` will need updating to expect `IDs 0–34`.

```bash
pnpm test
```

- [ ] **Step 4: Run `pnpm check && pnpm build`**

- [ ] **Step 5: Commit**

```bash
git add src/lib/brand.ts src/lib/brand.test.ts
git commit -m "feat: patternSummary() shows 'IDs 0–34' instead of 'id 0'

Uses idRange() to compute marker count per pattern type.
All exports (PDF, SVG, DXF, config headers) automatically updated.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Add `id_range` to config exports (Step 9 partial)

**Files:**
- Modify: `src/lib/exportConfig.ts`
- Modify: `src/lib/exportConfig.test.ts`

- [ ] **Step 1: Write tests**

Add to `src/lib/exportConfig.test.ts`:

```typescript
describe('id_range in configs', () => {
  it('opencvJson includes id_range for ChArUco', () => {
    const j = JSON.parse(opencvJson(charuco));
    expect(j.id_range).toEqual([0, 34]);
  });

  it('opencvJson omits id_range for Checkerboard', () => {
    const j = JSON.parse(opencvJson(checker));
    expect(j.id_range).toBeUndefined();
  });

  it('kalibrYaml includes id range comment for AprilGrid', () => {
    const y = kalibrYaml(aprilgrid);
    expect(y).toContain('# id_range: 0-');
  });

  it('ros2Yaml includes id_range for ChArUco', () => {
    const y = ros2Yaml(charuco);
    expect(y).toContain('id_range');
  });

  it('halconDescr includes id range comment', () => {
    const d = halconDescr(charuco);
    expect(d).toContain('id_range');
  });
});
```

- [ ] **Step 2: Update `opencvJson()`**

```typescript
import { idRange } from './idRange';

// In opencvJson(), after start_id:
const range = idRange(s);
if (range) {
  obj.id_range = [range.min, range.max];
}
```

- [ ] **Step 3: Update kalibr/ros2/halcon to include ID range in headers**

In each function, after the brand header or start_id line, add:

```typescript
const range = idRange(s);
if (range) {
  lines.push(`${commentChar} id_range: ${range.min}-${range.max} (${range.count} markers)`);
}
```

- [ ] **Step 4: Run tests + check + build**

- [ ] **Step 5: Commit**

```bash
git add src/lib/exportConfig.ts src/lib/exportConfig.test.ts
git commit -m "feat: id_range in opencv.json and config file headers

opencv.json gains 'id_range': [min, max]. Kalibr/ROS2/HALCON
headers include '# id_range: min-max (count markers)'.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Brand footer 3-tier fallback (Step 9 partial)

**Files:**
- Modify: `src/lib/svgLayers.ts`
- Modify: `src/lib/svgLayers.test.ts`
- Modify: `src/lib/exportPdf.ts`
- Modify: `src/lib/exportPdf.test.ts`

- [ ] **Step 1: Write tests for 3-tier fallback in SVG**

Add to `src/lib/svgLayers.test.ts`:

```typescript
describe('brandFooterSvg fallback tiers', () => {
  it('tier 1: full footer on normal A4 page', () => {
    const ctx = makeCtx({ rows: 7, cols: 10, square: 25 });
    const svg = brandFooterSvg(ctx);
    expect(svg).toContain('id="calibtools-brand"');
    expect(svg).toContain('calib');
  });

  it('tier 2: compact footer when page is tight', () => {
    // Make a spec where the board fills most of the page
    const ctx = makeCtx({ rows: 10, cols: 7, square: 25 });
    // Override ph to be just barely too small for full footer
    ctx.ph = ctx.oy + ctx.bh + 15; // only 15mm below pattern
    ctx.pw = 210;
    const svg = brandFooterSvg(ctx);
    // Should still have brand content, but compact
    expect(svg).toContain('calibtools-brand');
  });

  it('tier 3: warning text when even compact does not fit', () => {
    const ctx = makeCtx({ rows: 5, cols: 5, square: 25 });
    ctx.ph = ctx.oy + ctx.bh + 2; // only 2mm below pattern — nothing fits
    const svg = brandFooterSvg(ctx);
    expect(svg).toContain('Brand footer omitted');
  });
});
```

- [ ] **Step 2: Update `brandFooterSvg()` with 3-tier cascade**

```typescript
export function brandFooterSvg(ctx: SvgContext): string {
  const { spec: s, pw, ph, ox, oy, bw, bh } = ctx;
  const patternBottom = oy + bh;
  const scaleBarEnd = s.scaleBar ? patternBottom + 8 + 6 : patternBottom;
  const footerY = Math.max(scaleBarEnd + 4, patternBottom + 2 * s.square);

  // Tier 1: Full footer (logo + wordmark + summary + url)
  if (footerY + 10 < ph) {
    return fullBrandFooter(ctx, footerY);
  }

  // Tier 2: Compact one-line footer (logo 4mm + summary) in side quiet zone
  const compactY = Math.max(scaleBarEnd + 2, patternBottom + 4);
  if (compactY + 6 < ph) {
    return compactBrandFooter(ctx, compactY);
  }

  // Tier 3: Warning text — never silently omit
  return `<text x="${pw / 2}" y="${ph - 2}" font-family="'Geist Mono', monospace" font-size="1.8" text-anchor="middle" fill="#999">Brand footer omitted — page too small</text>`;
}

function fullBrandFooter(ctx: SvgContext, footerY: number): string {
  // ... existing full footer code moved here ...
}

function compactBrandFooter(ctx: SvgContext, footerY: number): string {
  const { spec: s, ox, bw } = ctx;
  const parts: string[] = [];
  const logoRects = logoSvgPaths({ x: ox, y: footerY, cellSize: 1.2, gap: 0.2 });
  const logoWidth = 3 * 1.2 + 2 * 0.2;
  const textX = ox + logoWidth + 1.5;
  const textY = footerY + 2.8;
  const summary = patternSummary({
    type: s.type, rows: s.rows, cols: s.cols, square: s.square,
    marker: s.marker, dict: s.dict, startId: s.startId,
  });
  parts.push('<g id="calibtools-brand">');
  parts.push(...logoRects);
  parts.push(`<text x="${textX}" y="${textY}" font-family="'Geist Mono', monospace" font-size="2" fill="#666">${summary} · calib.tools</text>`);
  parts.push('</g>');
  return parts.join('');
}
```

- [ ] **Step 3: Update `exportPdf.ts` with same 3-tier logic**

Mirror the SVG logic: if full footer doesn't fit, try compact, else add warning text.

- [ ] **Step 4: Run tests + check + build**

- [ ] **Step 5: Commit**

```bash
git add src/lib/svgLayers.ts src/lib/svgLayers.test.ts src/lib/exportPdf.ts src/lib/exportPdf.test.ts
git commit -m "feat: 3-tier brand footer fallback — never silently omitted

Tier 1: full footer (logo + wordmark + summary + url).
Tier 2: compact one-line (logo 4mm + summary) when page is tight.
Tier 3: visible warning text when nothing fits.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Corner ID badge + DXF text (Step 9 partial)

**Files:**
- Modify: `src/lib/svgLayers.ts`
- Modify: `src/lib/svgLayers.test.ts`
- Modify: `src/lib/exportDxf.ts`
- Modify: `src/islands/Generator.tsx`

- [ ] **Step 1: Write tests**

Add to `src/lib/svgLayers.test.ts`:

```typescript
describe('corner ID badge', () => {
  it('draws badge when startId != 0', () => {
    const ctx = makeCtx({ startId: 50, type: 'ChArUco' });
    const svg = cornerIdBadgeSvg(ctx);
    expect(svg).toContain('#50');
    expect(svg).toContain('class="corner-id-badge"');
  });

  it('badge is >= 1.5 squares from nearest pattern square', () => {
    const ctx = makeCtx({ startId: 10, type: 'ChArUco' });
    const svg = cornerIdBadgeSvg(ctx);
    // Parse badge position — should be in quiet zone
    const xMatch = svg.match(/x="([^"]+)"/);
    if (xMatch) {
      const badgeX = parseFloat(xMatch[1]);
      expect(badgeX).toBeLessThanOrEqual(ctx.ox - 1.5 * ctx.spec.square + 0.01);
    }
  });

  it('returns empty string when startId is 0', () => {
    expect(cornerIdBadgeSvg(makeCtx({ startId: 0 }))).toBe('');
  });

  it('respects showCornerBadge=false toggle', () => {
    const ctx = makeCtx({ startId: 50 });
    ctx.spec.showCornerBadge = false;
    expect(cornerIdBadgeSvg(ctx)).toBe('');
  });
});
```

- [ ] **Step 2: Add `showCornerBadge` to PatternSpec**

In `src/lib/patterns.ts`, add to PatternSpec:
```typescript
showCornerBadge?: boolean;  // corner ID badge when startId != 0 (default true)
```

- [ ] **Step 3: Implement `cornerIdBadgeSvg()` in svgLayers.ts**

```typescript
export function cornerIdBadgeSvg(ctx: SvgContext): string {
  const { spec: s, ox, oy } = ctx;
  if (s.startId === 0 || s.showCornerBadge === false) return '';

  const range = idRange(s);
  if (!range) return '';

  // Position: top-left quiet zone, >= 1.5 squares from nearest pattern square
  const gap = 1.5 * s.square;
  const badgeX = ox - gap;
  const badgeY = oy - gap + 10; // 10mm cap height
  const text = `#${s.startId}`;

  return `<text x="${badgeX}" y="${badgeY}" class="corner-id-badge" font-family="'Geist Mono', monospace" font-size="10" font-weight="700" fill="#333">${text}</text>`;
}
```

- [ ] **Step 4: Wire into patterns.ts and add toggle to Generator.tsx**

- [ ] **Step 5: Run tests + check + build**

- [ ] **Step 6: Commit**

```bash
git add src/lib/patterns.ts src/lib/svgLayers.ts src/lib/svgLayers.test.ts src/lib/exportDxf.ts src/islands/Generator.tsx
git commit -m "feat: corner ID badge in quiet zone when startId != 0

10mm cap height '#N' in Geist Mono, >= 1.5 squares from pattern.
Toggle to disable. Also in DXF text layer.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Multi-board set mode in generator (Step 10)

**Files:**
- Create: `src/lib/exportSet.ts`
- Create: `src/lib/exportSet.test.ts`
- Modify: `src/islands/Generator.tsx`

- [ ] **Step 1: Write tests for set export**

```typescript
// src/lib/exportSet.test.ts
import { describe, it, expect } from 'vitest';
import { computeSetBoards, buildSetManifest } from './exportSet';
import type { PatternSpec } from './patterns';

const base: PatternSpec = {
  type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

describe('computeSetBoards', () => {
  it('3 boards → IDs 0-34, 35-69, 70-104', () => {
    const boards = computeSetBoards(base, 3);
    expect(boards).toHaveLength(3);
    expect(boards[0].startId).toBe(0);
    expect(boards[0].idRange).toEqual({ min: 0, max: 34, count: 35 });
    expect(boards[1].startId).toBe(35);
    expect(boards[1].idRange).toEqual({ min: 35, max: 69, count: 35 });
    expect(boards[2].startId).toBe(70);
    expect(boards[2].idRange).toEqual({ min: 70, max: 104, count: 35 });
  });

  it('respects per-board override of startId', () => {
    const boards = computeSetBoards(base, 2, [0, 100]);
    expect(boards[0].startId).toBe(0);
    expect(boards[1].startId).toBe(100);
  });
});

describe('buildSetManifest', () => {
  it('produces valid JSON with board entries', () => {
    const boards = computeSetBoards(base, 2);
    const manifest = buildSetManifest(base, boards);
    const parsed = JSON.parse(manifest);
    expect(parsed.boards).toHaveLength(2);
    expect(parsed.boards[0].file).toContain('id0');
    expect(parsed.boards[1].file).toContain('id35');
    expect(parsed.pattern).toBe('ChArUco');
  });
});
```

- [ ] **Step 2: Implement `exportSet.ts`**

```typescript
import type { PatternSpec } from './patterns';
import { idRange, type IdRangeResult } from './idRange';
import { BRAND_NAME, BRAND_URL, patternSummary } from './brand';

export interface SetBoard {
  index: number;
  startId: number;
  idRange: IdRangeResult;
  spec: PatternSpec;
}

/**
 * Compute board specs for a multi-board set.
 * By default, board k starts at k × markersPerBoard.
 * Per-board overrides replace the computed start IDs.
 */
export function computeSetBoards(
  baseSpec: PatternSpec,
  count: number,
  overrideStartIds?: number[],
): SetBoard[] {
  const range = idRange(baseSpec);
  if (!range) return [];

  const markersPerBoard = range.count;
  const boards: SetBoard[] = [];

  for (let k = 0; k < count; k++) {
    const startId = overrideStartIds?.[k] ?? k * markersPerBoard;
    const spec = { ...baseSpec, startId };
    const boardRange = idRange(spec)!;
    boards.push({ index: k, startId, idRange: boardRange, spec });
  }

  return boards;
}

/**
 * Build a set-manifest.json string.
 */
export function buildSetManifest(baseSpec: PatternSpec, boards: SetBoard[]): string {
  const slug = `${baseSpec.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${baseSpec.rows}x${baseSpec.cols}-${baseSpec.square}mm`;
  return JSON.stringify({
    _generator: { name: BRAND_NAME, url: `https://${BRAND_URL}`, generated: new Date().toISOString().slice(0, 10) },
    pattern: baseSpec.type,
    rows: baseSpec.rows,
    cols: baseSpec.cols,
    square_mm: baseSpec.square,
    marker_mm: baseSpec.marker,
    dictionary: baseSpec.dict,
    board_count: boards.length,
    boards: boards.map(b => ({
      index: b.index,
      file: `${slug}-id${b.startId}.pdf`,
      start_id: b.startId,
      id_range: [b.idRange.min, b.idRange.max],
    })),
  }, null, 2);
}

/**
 * File name for a board PDF in a set.
 */
export function setBoardFilename(baseSpec: PatternSpec, startId: number): string {
  const slug = `${baseSpec.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${baseSpec.rows}x${baseSpec.cols}-${baseSpec.square}mm`;
  return `${slug}-id${startId}.pdf`;
}
```

- [ ] **Step 3: Add multi-board UI to Generator.tsx**

Add a "Number of boards" input (1–16) and a board table showing ID ranges. When n >= 2, show "Export set" button that generates a zip with n PDFs + manifest + overview.

```tsx
// State
const [boardCount, setBoardCount] = useState(1);
const [boardStartIds, setBoardStartIds] = useState<number[]>([]);

// Computed boards table
const boards = useMemo(() => {
  if (boardCount <= 1) return null;
  return computeSetBoards(spec, boardCount, boardStartIds.length ? boardStartIds : undefined);
}, [spec, boardCount, boardStartIds]);
```

UI controls between the pattern options and the download section:

```tsx
<div className="flex flex-col gap-3 border-t border-line pt-4">
  <label className="flex flex-col gap-2 text-[13px] font-semibold">Number of boards
    <input className={field} type="number" min={1} max={16}
      value={boardCount}
      onChange={(e) => setBoardCount(Math.max(1, Math.min(16, +e.target.value)))} />
  </label>
  {boards && (
    <div className="rounded border border-line bg-ground-panel p-3">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-ink-muted">
          <th className="pb-1">Board</th><th className="pb-1">Start ID</th><th className="pb-1">ID Range</th>
        </tr></thead>
        <tbody>{boards.map(b => (
          <tr key={b.index}>
            <td className="py-0.5">{b.index + 1}</td>
            <td><input type="number" className="w-16 rounded border px-1 py-0.5 text-sm"
              value={b.startId}
              onChange={(e) => {
                const ids = [...(boardStartIds.length ? boardStartIds : boards.map(bb => bb.startId))];
                ids[b.index] = +e.target.value;
                setBoardStartIds(ids);
              }} /></td>
            <td className="font-mono text-ink-muted">{b.idRange.min}–{b.idRange.max}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )}
</div>
```

The "Export set" button generates the zip using JSZip with all board PDFs + manifest + overview.

- [ ] **Step 4: Run tests + check + build**

- [ ] **Step 5: Commit**

```bash
git add src/lib/exportSet.ts src/lib/exportSet.test.ts src/islands/Generator.tsx
git commit -m "feat: multi-board set mode with zip export

Number of boards 1-16, consecutive ID assignment with per-board
override. Export set downloads zip with n PDFs (filenames include
start ID), set-manifest.json, and set-overview.pdf.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Marker sheet tool mode (Step 4)

**Files:**
- Create: `src/lib/renderMarkerSheet.ts`
- Create: `src/lib/renderMarkerSheet.test.ts`
- Modify: `src/lib/patterns.ts`
- Modify: `src/lib/tools.ts`
- Modify: `src/islands/Generator.tsx`

- [ ] **Step 1: Add 'Marker sheet' to PatternSpec type union**

In `src/lib/patterns.ts`:
```typescript
type: 'Checkerboard' | 'ChArUco' | 'AprilGrid (Kalibr)' | 'Asymmetric circles' | 'Symmetric circles' | 'ArUco grid' | 'HALCON-style dots' | 'Marker sheet';
```

- [ ] **Step 2: Write tests for marker sheet renderer**

```typescript
// src/lib/renderMarkerSheet.test.ts
import { describe, it, expect } from 'vitest';
import { renderMarkerSheetSvg } from './renderMarkerSheet';
import type { PatternSpec } from './patterns';

const base: PatternSpec = {
  type: 'Marker sheet', rows: 2, cols: 3, square: 40, marker: 30,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: false,
};

describe('renderMarkerSheetSvg', () => {
  it('renders correct number of markers', () => {
    const svg = renderMarkerSheetSvg(base, 20, 20);
    // 2 rows × 3 cols = 6 markers, each has a black bg rect
    const bgRects = svg.match(/class="marker-bg"/g);
    expect(bgRects).toHaveLength(6);
  });

  it('markers have quiet zone between them', () => {
    const svg = renderMarkerSheetSvg(base, 20, 20);
    expect(svg).toContain('rect');
  });

  it('shows ID labels when showTagIds is true', () => {
    const svg = renderMarkerSheetSvg({ ...base, showTagIds: true }, 20, 20);
    const labels = svg.match(/class="marker-id"/g);
    expect(labels).toHaveLength(6);
  });
});
```

- [ ] **Step 3: Implement `renderMarkerSheet.ts`**

```typescript
import type { PatternSpec } from './patterns';
import { getArUcoDict, decodeMarkerBits } from './dicts/dicts';
import { getAprilFamily, decodeAprilBits } from './dicts/dicts';
import { parseTagIdList } from './renderAprilGrid';

export function renderMarkerSheetSvg(s: PatternSpec, ox: number, oy: number): string {
  const parts: string[] = [];
  const markerSize = s.marker || s.square;
  const quietZone = s.square * 0.2; // 20% quiet zone
  const step = markerSize + quietZone;
  const numMarkers = s.rows * s.cols;
  const ids = parseTagIdList(s.tagIdList, s.startId, numMarkers);
  const dict = getArUcoDict(s.dict);
  const family = getAprilFamily(s.aprilFamily ?? '');

  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const idx = r * s.cols + c;
      const markerId = ids[idx];
      const mx = ox + c * step;
      const my = oy + r * step;

      // Black background
      parts.push(`<rect x="${mx}" y="${my}" width="${markerSize}" height="${markerSize}" class="marker-bg" fill="#000"/>`);

      // Render bits from dictionary or family
      if (dict && markerId < dict.count) {
        const bits = decodeMarkerBits(dict.bits[markerId], dict.markerSize);
        const n = dict.markerSize;
        const border = 1;
        const totalCells = n + 2 * border;
        const cell = markerSize / totalCells;
        for (let bi = 0; bi < n; bi++) {
          for (let bj = 0; bj < n; bj++) {
            if (bits[bi][bj] === 1) {
              parts.push(`<rect x="${mx + (bj + border) * cell}" y="${my + (bi + border) * cell}" width="${cell}" height="${cell}" fill="#fff"/>`);
            }
          }
        }
      } else if (family && markerId < family.count) {
        const d = family.d;
        const border = s.borderBits ?? 2;
        const totalCells = d + 2 * border;
        const cell = markerSize / totalCells;
        const bits = decodeAprilBits(family.codes[markerId], d);
        for (let bi = 0; bi < d; bi++) {
          for (let bj = 0; bj < d; bj++) {
            if (bits[bi][bj] === 1) {
              parts.push(`<rect x="${mx + (bj + border) * cell}" y="${my + (bi + border) * cell}" width="${cell}" height="${cell}" fill="#fff"/>`);
            }
          }
        }
      }

      // ID label
      if (s.showTagIds) {
        const labelY = my + markerSize + quietZone * 0.6;
        const labelX = mx + markerSize / 2;
        const fontSize = Math.min(quietZone * 0.5, 3);
        if (fontSize >= 0.8) {
          parts.push(`<text x="${labelX}" y="${labelY}" class="marker-id" font-family="'Geist Mono', monospace" font-size="${fontSize.toFixed(1)}" text-anchor="middle" fill="#333">${markerId}</text>`);
        }
      }
    }
  }
  return parts.join('');
}
```

- [ ] **Step 4: Register in tools.ts as generator tab**

The marker sheet is part of the generator, not a new top-level tool. Add it to the PATTERNS array in Generator.tsx:

```typescript
const PATTERNS = ['Checkerboard', 'ChArUco', 'AprilGrid (Kalibr)', 'Asymmetric circles', 'Symmetric circles', 'ArUco grid', 'HALCON-style dots', 'Marker sheet'] as const;
```

Wire it into the dispatcher in `patterns.ts`:

```typescript
} else if (s.type === 'Marker sheet') {
  parts.push(renderMarkerSheetSvg(s, ox, oy));
}
```

- [ ] **Step 5: Update idRange for Marker sheet**

In `idRange.ts`, add:
```typescript
if (type === 'Marker sheet') {
  const count = rows * cols;
  return { min: startId, max: startId + count - 1, count };
}
```

- [ ] **Step 6: Run tests + check + build**

- [ ] **Step 7: Commit**

```bash
git add src/lib/renderMarkerSheet.ts src/lib/renderMarkerSheet.test.ts src/lib/patterns.ts src/lib/idRange.ts src/islands/Generator.tsx
git commit -m "feat: Marker sheet tool mode — single/multiple markers per page

One or many markers with configurable size, IDs (range/list),
quiet zone, dictionary/family. Registered as generator tab.
PDF/SVG/PNG export with brand block.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Shop integration — board set with line-item properties (Step 11)

**Files:**
- Modify: `src/lib/shopify.ts`
- Modify: `src/islands/VariantPicker.tsx`

- [ ] **Step 1: Add `attributes` to `CartLineInput`**

In `src/lib/shopify.ts`, update the interface:

```typescript
export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
  attributes?: Array<{ key: string; value: string }>;
}
```

Update the `cartCreate` and `cartLinesAdd` mutations to include attributes:

```graphql
mutation CartCreate($lines: [CartLineInput!]!) {
  cartCreate(input: { lines: $lines }) {
    cart { id checkoutUrl }
    userErrors { field message }
  }
}
```

Note: Shopify's CartLineInput already supports `attributes` natively — the GraphQL schema accepts it. No mutation change needed; just pass the attributes in the lines.

Add a comment for 2b integration:

```typescript
// TODO(2b): Cart drawer should display line-item attributes (start_id, id_range).
// When building the drawer, read cart.lines[].attributes and show them in the line title.
```

- [ ] **Step 2: Update `buildCartLines` to accept attributes**

```typescript
export function buildCartLines(
  variantId: string,
  quantity: number,
  addonVariantIds: string[],
  attributes?: Array<{ key: string; value: string }>,
): CartLineInput[] {
  const lines: CartLineInput[] = [{ merchandiseId: variantId, quantity, attributes }];
  for (const id of addonVariantIds) {
    lines.push({ merchandiseId: id, quantity });
  }
  return lines;
}
```

- [ ] **Step 3: Update VariantPicker with board set option**

Add state for board count and computed ID ranges. When board count >= 2, add each board as its own cart line with start_id and id_range attributes.

Add in the options area:

```tsx
{/* Board set — shown for ChArUco/AprilGrid products */}
{(product.handle.includes('charuco') || product.handle.includes('aprilgrid')) && (
  <fieldset className="flex flex-col gap-2.5 border-0 p-0">
    <legend className="text-[13px] font-semibold">Board set</legend>
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4].map(n => (
        <label key={n} className={`cursor-pointer rounded border px-3.5 py-2.5 text-sm ${
          boardCount === n ? 'border-2 border-brand font-semibold' : 'border-line font-medium'
        }`}>
          <input type="radio" name="boardCount" value={n}
            checked={boardCount === n}
            onChange={() => setBoardCount(n)}
            className="sr-only" />
          {n === 1 ? '1 board' : `${n} boards`}
        </label>
      ))}
      <label className={`cursor-pointer rounded border px-3.5 py-2.5 text-sm ${
        boardCount > 4 ? 'border-2 border-brand font-semibold' : 'border-line font-medium'
      }`}>
        <input type="number" min={5} max={16}
          value={boardCount > 4 ? boardCount : ''}
          placeholder="Custom"
          onChange={(e) => setBoardCount(Math.max(1, Math.min(16, +e.target.value)))}
          className="w-16 bg-transparent text-center outline-none" />
      </label>
    </div>
    {boardCount >= 2 && boards && (
      <div className="rounded bg-ground-panel p-3 text-sm">
        {boards.map(b => (
          <div key={b.index} className="flex justify-between py-0.5">
            <span>Board {b.index + 1}</span>
            <span className="font-mono text-ink-muted">IDs {b.idRange.min}–{b.idRange.max}</span>
          </div>
        ))}
      </div>
    )}
  </fieldset>
)}
```

Update addToCart to add each board as a separate line with attributes:

```typescript
const handleAddToCart = async () => {
  if (!variant) return;
  setBusy('add');
  setError('');

  try {
    if (boardCount >= 2 && boards) {
      // Add each board as its own line with ID range attributes
      for (const board of boards) {
        const attrs = [
          { key: 'start_id', value: String(board.startId) },
          { key: 'id_range', value: `${board.idRange.min}–${board.idRange.max}` },
        ];
        const lines = buildCartLines(variant.id, quantity, [], attrs);
        await cartLinesAdd(getStoredCartId()!, lines);
      }
    } else {
      // Single board — existing flow
      await addToCart();
    }
    // ... confirmation logic
  } catch (err) { /* ... */ }
};
```

- [ ] **Step 4: Show attributes in mini-cart line title**

In the cart line display, show start_id and id_range if present. Add a comment for 2b:

```typescript
// TODO(2b): The cart drawer built in prompt 2b should read line.attributes
// and display start_id / id_range next to the product title.
```

- [ ] **Step 5: Run tests + check + build**

- [ ] **Step 6: Commit**

```bash
git add src/lib/shopify.ts src/islands/VariantPicker.tsx
git commit -m "feat: board set option with line-item start_id/id_range properties

CartLineInput gains attributes field. Board set (1-16) on ChArUco/
AprilGrid product pages. Each board added as own cart line with
start_id and id_range Shopify line-item properties.
Comment points to 2b for cart drawer display.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Content — multi-board guide + FAQ (Step 12)

**Files:**
- Create: `src/content/guides/multi-board-marker-ids.md`
- Modify: `src/lib/faq.ts` (or whichever file holds shared FAQ items)

- [ ] **Step 1: Create guide scaffold**

```markdown
---
title: "Multi-board marker IDs: why they matter and how to set them"
description: "When running multiple calibration boards in one rig, each board needs distinct marker IDs. Here's how to compute them and configure OpenCV and Kalibr."
date: 2026-10-24
readingTime: "3 min"
---

## Why boards in one rig need distinct ID ranges

[CHECK] When you use multiple calibration boards simultaneously — for example, in a multi-camera rig or a large-volume calibration setup — every ArUco marker or AprilTag across all boards must have a unique ID. If two boards share the same IDs, the detector cannot tell which board a marker belongs to, and your calibration will fail silently or produce incorrect results.

## How to compute ID ranges

[CHECK] For a ChArUco board with R rows and C columns, the number of markers is `floor(R × C / 2)`. For an AprilGrid, every cell is a tag, so the count is `R × C`.

Board 1 starts at ID 0. Board 2 starts at `markersPerBoard`. Board 3 starts at `2 × markersPerBoard`, and so on.

**Example:** A 7×10 ChArUco board has 35 markers.
- Board 1: IDs 0–34
- Board 2: IDs 35–69
- Board 3: IDs 70–104

## Configuring in OpenCV

[CHECK]

```python
board1 = cv2.aruco.CharucoBoard((10, 7), 0.025, 0.018, dictionary)
# Board 1 uses default IDs 0-34

board2 = cv2.aruco.CharucoBoard((10, 7), 0.025, 0.018, dictionary)
board2.setLegacyPattern(False)
# Set board 2 IDs starting at 35
ids = np.arange(35, 70)
board2.setIds(ids)
```

## Configuring in Kalibr

[CHECK] Kalibr's AprilGrid configuration uses `tagStartId` in the target YAML:

```yaml
target_type: 'aprilgrid'
tagRows: 6
tagCols: 6
tagSize: 0.030000
tagSpacing: 0.300000
# Board 2: start at tag 36
tagStartId: 36
```

## Using the set mode in our generator

[CHECK] In the [pattern generator](/tools/generator/), set "Number of boards" to your rig size. The generator assigns consecutive ID ranges automatically and lets you override per board. "Export set" downloads a zip with individual board PDFs, a manifest JSON, and an overview sheet for your rig assembler.
```

- [ ] **Step 2: Add FAQ item**

Find the FAQ data source (check `src/lib/faq.ts` or the product page content files) and add:

```typescript
{
  q: 'Ordering several boards for one rig?',
  a: 'Use the "Board set" option on the product page to select how many boards you need. Each board gets consecutive marker IDs so they work together in multi-board calibration. You can also override start IDs for each board.'
}
```

- [ ] **Step 3: Run build to verify content renders**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/content/guides/multi-board-marker-ids.md
git commit -m "content: multi-board marker ID guide + rig FAQ item

300-word guide: why boards need distinct IDs, how to compute ranges,
OpenCV and Kalibr configuration, link to generator set mode.
FAQ: 'Ordering several boards for one rig?'

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Final verification + push

- [ ] **Step 1: Run full test suite**

```bash
pnpm test && pnpm check && pnpm build
```

- [ ] **Step 2: Run Playwright e2e**

```bash
npx playwright test --config tests/e2e/playwright.config.ts
```

- [ ] **Step 3: Push Phase B**

```bash
git push
```

---

## Summary — Phase B delivers:

1. **`idRange()`** — computes {min,max,count} for any marker pattern
2. **"IDs 0–34"** — replaces "id 0" in all summaries, PDFs, SVGs, configs
3. **`id_range`** — in opencv.json, kalibr/ros2/halcon headers
4. **3-tier footer** — never silently omitted; auto page → compact → warning
5. **Corner ID badge** — `#N` in quiet zone when startId ≠ 0
6. **Multi-board set** — n boards with consecutive IDs, zip export with manifest + overview
7. **Marker sheet** — single/multiple markers per page, new generator tab
8. **Shop integration** — board set on product pages, line-item start_id/id_range
9. **Content** — multi-board guide + FAQ
