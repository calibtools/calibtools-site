/**
 * The AprilGrid has to be the board Kalibr expects, cell for cell. The oracle below is an
 * independent re-statement of Kalibr's own generator (aslam_cv/aslam_cameras_april/src/createTargetPDF.py,
 * generateAprilBoard and generateAprilTag), using Kalibr's tag codes; it shares no code with the renderer.
 */
import { describe, it, expect } from 'vitest';
import { patternShapes } from './patternShapes';
import { aprilGridTags, isKalibrFrame } from './renderAprilGrid';
import type { PatternSpec } from './patterns';

// tag36h11 codes 0–11 as listed in Kalibr's createTargetPDF.py (AprilTags C++ library encoding).
const KALIBR_T36H11 = [
  0xd5d628584n, 0xd97f18b49n, 0xdd280910en, 0xe479e9c98n, 0xebcbca822n, 0xf31dab3acn,
  0x056a5d085n, 0x10652e1d4n, 0x22b1dfeadn, 0x265ad0472n, 0x34fe91b86n, 0x3ff962cd5n,
];

interface Box { x: number; y: number; w: number; h: number }

/** Black rectangles of Kalibr's board, in Kalibr's own coordinates: mm, origin at the bottom-left tag corner, y up. */
function kalibrBoard(nCols: number, nRows: number, tagSize: number, tagSpacing: number, symmCorners: boolean): Box[] {
  const out: Box[] = [];
  const sqrtBits = 6, borderBits = 2, rotation = 2;
  const rot90 = (m: number[][]) => m[0].map((_, j) => m.map((row) => row[row.length - 1 - j])); // numpy.rot90, counter-clockwise
  for (let y = 0; y < nRows; y++) {
    for (let x = 0; x < nCols; x++) {
      const id = nCols * y + x;
      const xPos = x * (1 + tagSpacing) * tagSize, yPos = y * (1 + tagSpacing) * tagSize;
      const bit = tagSize / (sqrtBits + borderBits * 2), border = borderBits * bit;
      out.push({ x: xPos, y: yPos, w: tagSize, h: border }, { x: xPos, y: yPos + tagSize - border, w: tagSize, h: border });
      out.push({ x: xPos + tagSize - border, y: yPos, w: border, h: tagSize }, { x: xPos, y: yPos, w: border, h: tagSize });
      let code: number[][] = [];
      for (let i = 0; i < sqrtBits; i++) {
        code.push([]);
        for (let j = 0; j < sqrtBits; j++) code[i].push((KALIBR_T36H11[id] >> BigInt(sqrtBits * i + j)) & 1n ? 0 : 1);
      }
      for (let k = 0; k < rotation; k++) code = rot90(code);
      for (let i = 0; i < sqrtBits; i++) {
        for (let j = 0; j < sqrtBits; j++) {
          if (code[i][j]) out.push({ x: xPos + (j + borderBits) * bit, y: yPos + (borderBits - 1 + sqrtBits - i) * bit, w: bit, h: bit });
        }
      }
      if (symmCorners) {
        const s = tagSpacing * tagSize;
        for (const [cx, cy] of [[xPos - s, yPos - s], [xPos + tagSize, yPos - s], [xPos + tagSize, yPos + tagSize], [xPos - s, yPos + tagSize]]) out.push({ x: cx, y: cy, w: s, h: s });
      }
    }
  }
  return out;
}

const spec = (over: Partial<PatternSpec>): PatternSpec => ({
  type: 'AprilGrid (Kalibr)', rows: 2, cols: 3, square: 40, marker: 0, dict: '', paper: 'A4', startId: 0, scaleBar: false,
  aprilFamily: '36h11', borderBits: 2, tagSpacing: 0.3, ...over,
});

/** Is the point black on our board? Shapes paint in order; the last one covering the point wins. y is down from the top of the tag block. */
function oursBlack(shapes: ReturnType<typeof patternShapes>, px: number, py: number): boolean {
  let black = false;
  for (const s of shapes) {
    if (s.kind !== 'rect') continue;
    if (px > s.x && px < s.x + s.w && py > s.y && py < s.y + s.h) black = s.fill === '#000';
  }
  return black;
}

describe('AprilGrid is the board Kalibr generates', () => {
  it.each([
    ['2 × 3 with corner squares', { rows: 2, cols: 3, symmetricCorners: true }],
    ['3 × 4 without corner squares', { rows: 3, cols: 4, square: 22, tagSpacing: 0.25 }],
    ['1 × 2', { rows: 1, cols: 2, symmetricCorners: true }],
  ] as const)('%s: every cell matches', (_n, over) => {
    const s = spec(over);
    const gap = s.square * s.tagSpacing!;
    const blockH = s.rows * (s.square + gap) - gap, blockW = s.cols * (s.square + gap) - gap;
    const ref = kalibrBoard(s.cols, s.rows, s.square, s.tagSpacing!, s.symmetricCorners ?? false);
    const refBlack = (x: number, yUp: number) => ref.some((b) => x > b.x && x < b.x + b.w && yUp > b.y && yUp < b.y + b.h);
    const shapes = patternShapes(s);
    // Sample on a lattice of a quarter bit, offset so no sample lies on an edge, over the block plus one gap all round.
    const step = s.square / 10 / 4;
    let samples = 0, black = 0;
    for (let x = -gap + step / 2; x < blockW + gap; x += step) {
      for (let yDown = -gap + step / 2; yDown < blockH + gap; yDown += step) {
        const want = refBlack(x, blockH - yDown);
        if (oursBlack(shapes, x, yDown) !== want) throw new Error(`cell at x=${x.toFixed(2)}, y=${yDown.toFixed(2)} mm from the top-left: Kalibr has ${want ? 'black' : 'white'}`);
        samples++; if (want) black++;
      }
    }
    expect(samples).toBeGreaterThan(1000);
    expect(black).toBeGreaterThan(samples * 0.2);
  });

  it('numbers tags from the bottom-left, left to right and then upward', () => {
    const tags = aprilGridTags(spec({ rows: 3, cols: 4, square: 20, tagSpacing: 0.5 }));
    expect(tags.map((t) => t.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(tags[0]).toMatchObject({ row: 0, col: 0, x: 0, y: 60 });
    expect(tags[3]).toMatchObject({ row: 0, col: 3, x: 90, y: 60 });
    expect(tags[4]).toMatchObject({ row: 1, col: 0, x: 0, y: 30 });
    expect(tags[11]).toMatchObject({ row: 2, col: 3, x: 90, y: 0 });
  });

  it('a start ID or an ID list keeps the same order', () => {
    expect(aprilGridTags(spec({ startId: 36 }))[0]).toMatchObject({ id: 36, row: 0, col: 0 });
    const listed = aprilGridTags(spec({ tagIdList: '10-12,20-22' }));
    expect(listed.filter((t) => t.row === 0).map((t) => t.id)).toEqual([10, 11, 12]);
    expect(listed.filter((t) => t.row === 1).map((t) => t.id)).toEqual([20, 21, 22]);
  });

  it('uses the Kalibr frame with or without corner squares', () => {
    expect(isKalibrFrame(spec({}))).toBe(true);
    expect(isKalibrFrame(spec({ symmetricCorners: true }))).toBe(true);
    expect(isKalibrFrame({ type: 'ChArUco' })).toBe(false);
  });
});

describe('what sits around an AprilGrid on the page', () => {
  it('scale bar and axes stay clear of the corner squares and of each other', async () => {
    const { scaleBarTop, axesOffset, inkOverhang } = await import('./renderAprilGrid');
    const plain = spec({ square: 35, scaleBar: true });
    const withSquares = spec({ square: 35, scaleBar: true, symmetricCorners: true });
    expect(inkOverhang(plain)).toBe(0);
    expect(inkOverhang(withSquares)).toBeCloseTo(10.5, 9);
    // The bar starts below the lowest corner square.
    expect(scaleBarTop(withSquares, 0, 100)).toBeGreaterThan(100 + inkOverhang(withSquares));
    // The origin sits below the bar and its label (bar + 4 mm + 2.6 mm text), and left of the corner squares.
    for (const s of [plain, withSquares, spec({ square: 14, scaleBar: true, symmetricCorners: true })]) {
      const off = axesOffset(s);
      expect(100 + off.y).toBeGreaterThan(scaleBarTop(s, 0, 100) + 4 + 2.6);
      expect(off.x).toBeGreaterThan(inkOverhang(s));
    }
    // Without a scale bar the origin goes back to half a tag below the block.
    expect(axesOffset(spec({ square: 35, scaleBar: false })).y).toBeCloseTo(17.5, 9);
  });

  it('the parameter line names tags, gap and family, not an ArUco dictionary', async () => {
    const { patternSummary } = await import('./brand');
    const line = patternSummary({ ...spec({ rows: 6, cols: 8, square: 35 }), dict: 'DICT_6X6_250', marker: 22 });
    expect(line).toBe('AprilGrid (Kalibr) 6×8 · 35 mm tags, 10.5 mm gap · tag36h11 · IDs 0–47');
    expect(line).not.toContain('DICT_');
  });
});
