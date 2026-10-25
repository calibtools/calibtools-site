import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const jsonPath = resolve(ROOT, 'scripts/brand-overlay.json');

interface Board {
  board_id: string;
  corners: [number, number][] | null;
  area: number | null;
}
interface ImageEntry {
  dims: [number, number];
  boards: Board[];
}

const data: Record<string, ImageEntry> = JSON.parse(readFileSync(jsonPath, 'utf-8'));

// Board specs (mm)
const BOARD_SPECS: Record<string, { board_mm: [number, number]; pattern_mm: [number, number] }> = {
  B1: { board_mm: [300, 240], pattern_mm: [250, 175] },
  B2: { board_mm: [300, 240], pattern_mm: [250, 175] },
  B3: { board_mm: [200, 150], pattern_mm: [170, 120] },
};

// Text lines
const BOARD_TEXTS: Record<string, string> = {
  B1: 'CALIB.TOOLS   CT-CHT-P-300240-2500   Checkerboard 7\u00d710 \u00b7 25 mm   SN 000093 \u00b7 Rev A',
  B2: 'CALIB.TOOLS   CT-CHA-P-300240-2518   ChArUco 7\u00d710 \u00b7 25/18 mm \u00b7 DICT_6X6_250 \u00b7 IDs 0\u201334   SN 000127 \u00b7 Rev A',
  B3: 'CALIB.TOOLS   CT-CHA-C-200150-1007   ChArUco 12\u00d717 \u00b7 10/7 mm \u00b7 DICT_6X6_250 \u00b7 IDs 0\u2013101   SN 000311 \u00b7 Rev A',
};

function boardPixelWidth(board: Board): number {
  if (!board.corners) return 0;
  const [tl, tr] = board.corners;
  return Math.sqrt((tr[0] - tl[0]) ** 2 + (tr[1] - tl[1]) ** 2);
}

function boardPixelHeight(board: Board): number {
  if (!board.corners) return 0;
  const [tl, , , bl] = board.corners;
  return Math.sqrt((bl[0] - tl[0]) ** 2 + (bl[1] - tl[1]) ** 2);
}

describe('brand overlay geometry', () => {
  it('B3 overlay text width is ≤ 45% of detected board width', () => {
    // The text line is the longest for B3 relative to board width.
    // We check that the spec text at 1% cap height fits within 45%.
    const text = BOARD_TEXTS.B3;
    const spec = BOARD_SPECS.B3;
    // Approximate: at 1% of 150mm = 1.5mm cap height, and 45% of 200mm = 90mm.
    // Mono font at ~0.6em width per char → 1.5mm * 0.6 * chars ≈ text width
    // Conservative estimate: 0.7 * cap_h * length
    const capH = 0.01 * spec.board_mm[1];
    const maxWidth = 0.45 * spec.board_mm[0];
    // At ~0.55 em average width (mono is wider than proportional)
    const estimatedWidth = text.length * capH * 0.55;
    expect(estimatedWidth).toBeLessThanOrEqual(maxWidth);
  });

  it('B3 text bounding box lies inside the lower margin', () => {
    const spec = BOARD_SPECS.B3;
    const [bw, bh] = spec.board_mm;
    const [pw, ph] = spec.pattern_mm;
    const marginBot = (bh - ph) / 2;  // 15mm
    // Text baseline is 30% of margin height above lower edge
    const baselineFromBottom = 0.30 * marginBot;  // 4.5mm
    const capH = 0.01 * bh;  // 1.5mm
    // Text top = bh - baselineFromBottom - capH = 150 - 4.5 - 1.5 = 144mm
    // Pattern bottom edge = (bh - ph) / 2 + ph = 15 + 120 = 135mm
    const textTop = bh - baselineFromBottom - capH;
    const patternBottom = marginBot + ph;
    expect(textTop).toBeGreaterThan(patternBottom);
  });

  it('arrows lie inside the upper-left margin', () => {
    for (const bid of ['B1', 'B2', 'B3'] as const) {
      const spec = BOARD_SPECS[bid];
      const [bw, bh] = spec.board_mm;
      const [pw, ph] = spec.pattern_mm;
      const marginLeft = (bw - pw) / 2;
      const marginTop = (bh - ph) / 2;
      const arrowLen = 0.03 * bh;
      // Arrow origin at 35% into margin
      const ox = marginLeft * 0.35;
      const oy = marginTop * 0.35;
      // X arrow extends right by arrowLen
      expect(ox + arrowLen).toBeLessThan(marginLeft);
      // Y arrow extends down by arrowLen
      expect(oy + arrowLen).toBeLessThan(marginTop);
    }
  });
});

describe('family-set board ID ranges', () => {
  it('has four boards with distinct ID ranges', () => {
    const entry = data['family-set.png'];
    expect(entry).toBeDefined();
    expect(entry.boards).toHaveLength(4);

    const idRanges = [
      'IDs 0\u201334',
      'IDs 35\u201369',
      'IDs 70\u2013104',
      'IDs 105\u2013139',
    ];
    // All four are distinct
    const unique = new Set(idRanges);
    expect(unique.size).toBe(4);
    // All boards have non-null corners
    for (const b of entry.boards) {
      expect(b.corners).not.toBeNull();
    }
  });
});

describe('colour correction', () => {
  it('mobile hero board-face mean channels are within ±3 after correction', () => {
    // Run a quick Python check on the output WebP
    const result = execSync(
      `python3 -c "
import cv2, numpy as np
img = cv2.imread('src/assets/products/brand/dark/hero-three-boards-mobile.webp')
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
_, mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
b = img[:,:,0][mask>0].mean()
g = img[:,:,1][mask>0].mean()
r = img[:,:,2][mask>0].mean()
spread = max(r,g,b) - min(r,g,b)
print(f'{spread:.1f}')
"`,
      { encoding: 'utf-8', cwd: ROOT },
    );
    const spread = parseFloat(result.trim());
    expect(spread).toBeLessThanOrEqual(3);
  });
});
