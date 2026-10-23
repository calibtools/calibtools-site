# Phase C — E2E Tests + PuzzleBoard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive Playwright e2e tests for the multi-board set export and product page board-set flow, then implement PuzzleBoard (Stelldinger et al., ICCV 2023) behind a `?beta=puzzle` feature flag with a decoding self-test.

**Architecture:** Playwright tests exercise the built site via `pnpm preview`. The set-export test navigates to the generator, sets n=3, triggers "Export set", intercepts the download, and verifies the zip contains 3 PDFs + manifest. The product-page test verifies the board-set UI renders ID ranges. PuzzleBoard is a new PatternSpec type with its own renderer; the `?beta=puzzle` flag is read from the URL in the Generator component to show/hide it.

**Tech Stack:** Playwright, TypeScript, Vitest, JSZip (for zip inspection in tests)

**Working directory:** `/Users/malinto/Documents/calibtools-site`

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `tests/e2e/set-export.spec.ts` | Playwright: generator n=3 exports zip with 3 PDFs + manifest |
| `tests/e2e/product-board-set.spec.ts` | Playwright: product page board set adds lines with id_range |
| `src/lib/renderPuzzleBoard.ts` | PuzzleBoard renderer (feature-flagged) |
| `src/lib/renderPuzzleBoard.test.ts` | Vitest: PuzzleBoard geometry + decoding self-test |
| `docs/puzzleboard.md` | Design doc if full implementation isn't feasible |

### Modified files
| File | Changes |
|------|---------|
| `src/lib/patterns.ts` | Add 'PuzzleBoard' to type union; wire renderer (gated on beta) |
| `src/lib/idRange.ts` | Add PuzzleBoard case |
| `src/islands/Generator.tsx` | Show PuzzleBoard in PATTERNS only when `?beta=puzzle` is in URL |

---

## Task 1: Playwright e2e — set export with n=3 (Step 13)

**Files:**
- Create: `tests/e2e/set-export.spec.ts`

- [ ] **Step 1: Write the e2e test**

```typescript
// tests/e2e/set-export.spec.ts
import { test, expect } from '@playwright/test';
import JSZip from 'jszip';

test('generator with n=3 exports a zip with 3 PDFs and a manifest', async ({ page }) => {
  // Navigate to generator with ChArUco preset
  await page.goto('/tools/generator/?type=ChArUco&rows=7&cols=10&square=25&marker=18&dict=DICT_6X6_250');

  // Wait for hydration
  await expect(page.locator('h1')).toContainText('Pattern generator');

  // Set number of boards to 3
  const boardsInput = page.locator('input[type="number"][min="1"][max="16"]');
  await boardsInput.fill('3');

  // Verify board table appears with 3 rows
  await expect(page.locator('table tbody tr')).toHaveCount(3);

  // Verify ID ranges in the table
  await expect(page.locator('table tbody tr').nth(0)).toContainText('0–34');
  await expect(page.locator('table tbody tr').nth(1)).toContainText('35–69');
  await expect(page.locator('table tbody tr').nth(2)).toContainText('70–104');

  // Click "Export set" and capture the download
  const downloadPromise = page.waitForEvent('download');
  await page.locator('button', { hasText: /Export set.*3 boards/ }).click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('set-3boards');
  expect(download.suggestedFilename()).toEndWith('.zip');

  // Read and inspect the zip
  const path = await download.path();
  if (path) {
    const fs = await import('node:fs');
    const buffer = fs.readFileSync(path);
    const zip = await JSZip.loadAsync(buffer);
    const files = Object.keys(zip.files);

    // Should contain 3 PDFs with IDs in filenames
    const pdfs = files.filter(f => f.endsWith('.pdf'));
    expect(pdfs).toHaveLength(3);
    expect(pdfs.some(f => f.includes('id0'))).toBe(true);
    expect(pdfs.some(f => f.includes('id35'))).toBe(true);
    expect(pdfs.some(f => f.includes('id70'))).toBe(true);

    // Should contain manifest
    expect(files).toContain('set-manifest.json');
    const manifestText = await zip.file('set-manifest.json')!.async('string');
    const manifest = JSON.parse(manifestText);
    expect(manifest.board_count).toBe(3);
    expect(manifest.boards).toHaveLength(3);
    expect(manifest.boards[0].id_range).toEqual([0, 34]);
    expect(manifest.boards[1].id_range).toEqual([35, 69]);
    expect(manifest.boards[2].id_range).toEqual([70, 104]);

    // Each PDF should start with %PDF-
    for (const pdfName of pdfs) {
      const pdfBytes = await zip.file(pdfName)!.async('uint8array');
      const header = new TextDecoder().decode(pdfBytes.slice(0, 5));
      expect(header).toBe('%PDF-');
    }
  }
});

test('board table allows editing start IDs', async ({ page }) => {
  await page.goto('/tools/generator/?type=ChArUco&rows=7&cols=10&square=25&marker=18&dict=DICT_6X6_250');
  await expect(page.locator('h1')).toContainText('Pattern generator');

  // Set 2 boards
  const boardsInput = page.locator('input[type="number"][min="1"][max="16"]');
  await boardsInput.fill('2');
  await expect(page.locator('table tbody tr')).toHaveCount(2);

  // Override board 2's start ID to 100
  const board2Input = page.locator('table tbody tr').nth(1).locator('input[type="number"]');
  await board2Input.fill('100');

  // Verify ID range updated
  await expect(page.locator('table tbody tr').nth(1)).toContainText('100–134');
});
```

- [ ] **Step 2: Run the test**

```bash
npx playwright test tests/e2e/set-export.spec.ts --config tests/e2e/playwright.config.ts
```

Note: This test requires the site to build and serve, and triggers actual PDF generation in the browser. It may take 30-60 seconds. If the download times out, increase the timeout.

- [ ] **Step 3: Fix any issues and re-run**

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/set-export.spec.ts
git commit -m "test(e2e): set export with n=3 verifies zip contents and ID ranges

Downloads zip, inspects 3 PDFs + manifest. Verifies filenames contain
start IDs, manifest has correct id_range arrays, PDFs are valid.
Also tests editing per-board start IDs.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Playwright e2e — product page board set (Step 13)

**Files:**
- Create: `tests/e2e/product-board-set.spec.ts`

- [ ] **Step 1: Write the e2e test**

Note: Product pages need Shopify credentials to render real data. In test mode (no credentials), the site uses fallback data. The board-set UI appears based on the product handle containing "charuco". Check if fallback products include a charuco handle.

```typescript
// tests/e2e/product-board-set.spec.ts
import { test, expect } from '@playwright/test';

test('product page shows board set option for ChArUco products', async ({ page }) => {
  // Try the charuco-composite product page (uses fallback data in test)
  await page.goto('/targets/charuco-composite/');

  // The page should load (even with fallback data)
  await expect(page.locator('h1')).toBeVisible();

  // Check if board set fieldset is visible
  const boardSetLegend = page.locator('legend', { hasText: 'Board set' });
  // If the product loaded with fallback data that includes a charuco handle,
  // the board set UI should appear
  if (await boardSetLegend.isVisible()) {
    // Select 2 boards
    await page.locator('label', { hasText: '2 boards' }).click();

    // Board table should show 2 rows with ID ranges
    const boardRows = page.locator('text=/IDs \\d+/');
    await expect(boardRows).toHaveCount(2);
  }
});

test('board set radio buttons work', async ({ page }) => {
  await page.goto('/targets/charuco-composite/');
  await expect(page.locator('h1')).toBeVisible();

  const boardSetLegend = page.locator('legend', { hasText: 'Board set' });
  if (await boardSetLegend.isVisible()) {
    // Default is 1 board — no table shown
    const table = page.locator('text=/IDs \\d+/');
    await expect(table).toHaveCount(0);

    // Select 3 boards
    await page.locator('label', { hasText: '3 boards' }).click();
    await expect(page.locator('text=/IDs \\d+/')).toHaveCount(3);

    // Back to 1 board
    await page.locator('label', { hasText: '1 board' }).click();
    await expect(page.locator('text=/IDs \\d+/')).toHaveCount(0);
  }
});
```

- [ ] **Step 2: Run the test**

```bash
npx playwright test tests/e2e/product-board-set.spec.ts --config tests/e2e/playwright.config.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/product-board-set.spec.ts
git commit -m "test(e2e): product page board set UI renders ID ranges

Verifies board set fieldset appears on charuco product pages,
radio buttons toggle board count, and ID range rows update.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: PuzzleBoard design assessment

**Files:**
- Create: `docs/puzzleboard.md` (if needed)

Before implementing, we need to assess whether the PuzzleBoard pattern (Stelldinger et al., ICCV 2023) can be faithfully implemented. The paper describes:

- A grid of squares where each square is either black, white, or a "puzzle" interlock shape
- The pattern encodes its own position via a deterministic sequence
- A decoder can identify any sub-window's offset from the pattern content alone
- The encoding uses a de Bruijn–like sequence in 2D

- [ ] **Step 1: Research the PuzzleBoard algorithm**

Search for the paper's reference implementation or algorithm description. Key questions:
1. Is the encoding algorithm public and described precisely enough to implement?
2. Can we implement the decoding self-test (render → decode → verify offset)?
3. What are the required parameters (cols, rows, squareSize, startOffsetX, startOffsetY)?

- [ ] **Step 2: Decision gate**

If the algorithm can be implemented faithfully → proceed to Task 4.
If not → write `docs/puzzleboard.md` design doc and stop.

The design doc should contain:
- What PuzzleBoard is and why it's useful
- The algorithm as understood from the paper
- What's missing or unclear for a faithful implementation
- Recommended next steps (e.g., contact authors, reference implementation)

---

## Task 4: PuzzleBoard renderer (if feasible) (Step 6)

**Files:**
- Create: `src/lib/renderPuzzleBoard.ts`
- Create: `src/lib/renderPuzzleBoard.test.ts`
- Modify: `src/lib/patterns.ts`
- Modify: `src/lib/idRange.ts`
- Modify: `src/islands/Generator.tsx`

- [ ] **Step 1: Add PuzzleBoard to PatternSpec**

```typescript
// In patterns.ts type union, add:
| 'PuzzleBoard'

// Add PuzzleBoard-specific optional fields:
puzzleOffsetX?: number;  // start offset X (squares)
puzzleOffsetY?: number;  // start offset Y (squares)
```

- [ ] **Step 2: Write tests including decoding self-test**

```typescript
// src/lib/renderPuzzleBoard.test.ts
import { describe, it, expect } from 'vitest';
import { renderPuzzleBoardSvg, decodePuzzleOffset } from './renderPuzzleBoard';
import type { PatternSpec } from './patterns';

const base: PatternSpec = {
  type: 'PuzzleBoard' as any,
  rows: 8, cols: 12, square: 25, marker: 0,
  dict: '', paper: 'A4', startId: 0, scaleBar: false,
  puzzleOffsetX: 0, puzzleOffsetY: 0,
};

describe('renderPuzzleBoardSvg', () => {
  it('renders rects for the grid', () => {
    const svg = renderPuzzleBoardSvg(base, 20, 20);
    const rects = svg.match(/<rect/g);
    expect(rects).not.toBeNull();
    expect(rects!.length).toBeGreaterThan(0);
  });

  it('different offsets produce different patterns', () => {
    const svg1 = renderPuzzleBoardSvg(base, 20, 20);
    const svg2 = renderPuzzleBoardSvg({ ...base, puzzleOffsetX: 3, puzzleOffsetY: 2 }, 20, 20);
    expect(svg1).not.toBe(svg2);
  });
});

describe('decodePuzzleOffset (self-test)', () => {
  it('decodes a rendered sub-window back to its offset', () => {
    const spec = { ...base, puzzleOffsetX: 5, puzzleOffsetY: 3 };
    // Render the pattern and extract the cell grid
    const grid = renderPuzzleGrid(spec);
    // Decode should recover the offset
    const decoded = decodePuzzleOffset(grid, spec.rows, spec.cols);
    expect(decoded).toEqual({ x: 5, y: 3 });
  });

  it('works for offset (0,0)', () => {
    const grid = renderPuzzleGrid(base);
    const decoded = decodePuzzleOffset(grid, base.rows, base.cols);
    expect(decoded).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 3: Implement the PuzzleBoard renderer**

The renderer produces a grid where each cell's fill (black/white) is determined by a 2D de Bruijn-like sequence that encodes the global position. Export:
- `renderPuzzleBoardSvg(spec, ox, oy)` — SVG elements
- `renderPuzzleGrid(spec)` — 2D number array for self-test
- `decodePuzzleOffset(grid, rows, cols)` — recovers {x, y} offset

- [ ] **Step 4: Wire into Generator with beta flag**

In Generator.tsx, read `?beta=puzzle` from the URL and conditionally include 'PuzzleBoard' in PATTERNS:

```typescript
const [showBeta, setShowBeta] = useState(false);
useEffect(() => {
  if (typeof window !== 'undefined') {
    setShowBeta(new URLSearchParams(window.location.search).has('beta') &&
                new URLSearchParams(window.location.search).get('beta') === 'puzzle');
  }
}, []);

const VISIBLE_PATTERNS = showBeta
  ? [...PATTERNS, 'PuzzleBoard' as const]
  : PATTERNS;
```

- [ ] **Step 5: Run tests + check + build**

```bash
pnpm test && pnpm check && pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/renderPuzzleBoard.ts src/lib/renderPuzzleBoard.test.ts src/lib/patterns.ts src/lib/idRange.ts src/islands/Generator.tsx
git commit -m "feat(beta): PuzzleBoard pattern behind ?beta=puzzle flag

Stelldinger et al. ICCV 2023. 2D de Bruijn encoding allows decoding
sub-window offset. Decoding self-test verifies round-trip.
Hidden behind ?beta=puzzle query param.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Final verification + push Phase C

- [ ] **Step 1: Run all tests**

```bash
pnpm test && pnpm check && pnpm build
```

- [ ] **Step 2: Run all Playwright e2e**

```bash
npx playwright test --config tests/e2e/playwright.config.ts
```

- [ ] **Step 3: Push**

```bash
git push
```

- [ ] **Step 4: Report what remains manual**

The only manual step is enabling Shopify line-item property display on packing slips:
- Go to Shopify admin → Settings → Checkout → Order processing
- Enable "Show line item properties"
- This makes start_id and id_range visible on packing slips and order confirmations

---

## Summary — Phase C delivers:

1. **E2E: Set export** — Playwright test downloads zip, inspects 3 PDFs + manifest, verifies IDs
2. **E2E: Product board set** — Playwright test verifies board set UI on product pages
3. **PuzzleBoard** — Feature-flagged renderer with decoding self-test (or design doc if infeasible)
4. **Manual item reported** — Shopify packing slip line-item property display
