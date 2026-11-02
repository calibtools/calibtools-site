/**
 * Verify boardSizes.ts matches the ordering tables in the datasheets.
 * If a datasheet changes, this test will catch the drift.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  COMPOSITE_SIZES, CERAMIC_SIZES, APRILGRID_SIZES,
  markerCount, findCharucoSize, findAprilGridSize,
} from '../../src/lib/boardSizes';

/** Parse a ChArUco ordering table from a datasheet markdown file. */
function parseCharucoTable(filepath: string) {
  const md = readFileSync(resolve(__dirname, '../../', filepath), 'utf-8');
  const lines = md.split('\n');
  // Find the ordering table header row (contains "Squares (rows × cols)")
  const headerIdx = lines.findIndex(l => /Squares\s*\(rows\s*[×x]\s*cols\)/.test(l));
  if (headerIdx < 0) throw new Error(`No ordering table found in ${filepath}`);
  // Skip separator line, then parse data rows
  const rows: Array<{ label: string; rows: number; cols: number; square: number; marker: number; markers: number }> = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) break;
    // Keep empty cells (e.g. empty Dictionary column) — split then drop leading/trailing empties
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 7) continue;
    // Size (W × H) — column 1
    const sizeMatch = cells[1].match(/(\d+)\s*[×x]\s*(\d+)/);
    if (!sizeMatch) continue;
    const label = `${sizeMatch[1]} × ${sizeMatch[2]}`;
    // Squares (rows × cols) — column 2
    const sqMatch = cells[2].match(/(\d+)\s*[×x]\s*(\d+)/);
    if (!sqMatch) continue;
    const r = Number(sqMatch[1]);
    const c = Number(sqMatch[2]);
    // Square / marker — column 3
    const dimMatch = cells[3].match(/([\d.]+)\s*\/\s*([\d.]+)/);
    if (!dimMatch) continue;
    const square = Number(dimMatch[1]);
    const marker = Number(dimMatch[2]);
    // Markers — last column (column 6)
    const markers = Number(cells[6]);
    rows.push({ label, rows: r, cols: c, square, marker, markers });
  }
  return rows;
}

/** Parse an AprilGrid ordering table from a datasheet markdown file. */
function parseAprilGridTable(filepath: string) {
  const md = readFileSync(resolve(__dirname, '../../', filepath), 'utf-8');
  const lines = md.split('\n');
  // Find the ordering table header row (contains "Tags (rows × cols)")
  const headerIdx = lines.findIndex(l => /Tags\s*\(rows\s*[×x]\s*cols\)/.test(l));
  if (headerIdx < 0) throw new Error(`No ordering table found in ${filepath}`);
  const rows: Array<{ label: string; rows: number; cols: number; tagSize: number; gap: number; markers: number }> = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 5) continue;
    // Size (W × H) — column 1
    const sizeMatch = cells[1].match(/(\d+)\s*[×x]\s*(\d+)/);
    if (!sizeMatch) continue;
    const label = `${sizeMatch[1]} × ${sizeMatch[2]}`;
    // Tags (rows × cols) — column 2
    const tagMatch = cells[2].match(/(\d+)\s*[×x]\s*(\d+)/);
    if (!tagMatch) continue;
    const r = Number(tagMatch[1]);
    const c = Number(tagMatch[2]);
    // Tag / gap — column 3
    const dimMatch = cells[3].match(/([\d.]+)\s*\/\s*([\d.]+)/);
    if (!dimMatch) continue;
    const tagSize = Number(dimMatch[1]);
    const gap = Number(dimMatch[2]);
    // Markers — last column (column 4)
    const markers = Number(cells[4]);
    rows.push({ label, rows: r, cols: c, tagSize, gap, markers });
  }
  return rows;
}

describe('boardSizes vs datasheets', () => {
  const chaPRows = parseCharucoTable('docs/datasheets/CT-DS-CHA-P.md');
  const chaCRows = parseCharucoTable('docs/datasheets/CT-DS-CHA-C.md');
  const aprRows = parseAprilGridTable('docs/datasheets/CT-DS-APR-P.md');

  it('CHA-P datasheet has expected row count', () => {
    expect(chaPRows.length).toBe(COMPOSITE_SIZES.length);
  });

  it.each(chaPRows)('CHA-P $label matches boardSizes', (ds) => {
    const bs = COMPOSITE_SIZES.find(s => s.label === ds.label);
    expect(bs, `missing boardSize for ${ds.label}`).toBeDefined();
    expect(bs!.rows).toBe(ds.rows);
    expect(bs!.cols).toBe(ds.cols);
    expect(bs!.square).toBe(ds.square);
    expect(bs!.marker).toBe(ds.marker);
    expect(markerCount('charuco', bs!.rows, bs!.cols)).toBe(ds.markers);
  });

  it('CHA-C datasheet has expected row count', () => {
    expect(chaCRows.length).toBe(CERAMIC_SIZES.length);
  });

  it.each(chaCRows)('CHA-C $label matches boardSizes', (ds) => {
    const bs = CERAMIC_SIZES.find(s => s.label === ds.label);
    expect(bs, `missing boardSize for ${ds.label}`).toBeDefined();
    expect(bs!.rows).toBe(ds.rows);
    expect(bs!.cols).toBe(ds.cols);
    expect(bs!.square).toBe(ds.square);
    expect(bs!.marker).toBe(ds.marker);
    expect(markerCount('charuco', bs!.rows, bs!.cols)).toBe(ds.markers);
  });

  it('APR-P datasheet has expected row count', () => {
    expect(aprRows.length).toBe(APRILGRID_SIZES.length);
  });

  it.each(aprRows)('APR-P $label matches boardSizes', (ds) => {
    const bs = APRILGRID_SIZES.find(s => s.label === ds.label);
    expect(bs, `missing boardSize for ${ds.label}`).toBeDefined();
    expect(bs!.rows).toBe(ds.rows);
    expect(bs!.cols).toBe(ds.cols);
    expect(bs!.tagSize).toBe(ds.tagSize);
    expect(bs!.gap).toBe(ds.gap);
    expect(markerCount('aprilgrid', bs!.rows, bs!.cols)).toBe(ds.markers);
  });
});

describe('markerCount', () => {
  it('charuco: floor(rows * cols / 2)', () => {
    expect(markerCount('charuco', 5, 7)).toBe(17);   // 35/2 = 17.5 → 17
    expect(markerCount('charuco', 7, 10)).toBe(35);   // 70/2 = 35
    expect(markerCount('charuco', 11, 15)).toBe(82);  // 165/2 = 82.5 → 82
  });

  it('aprilgrid: rows * cols', () => {
    expect(markerCount('aprilgrid', 4, 6)).toBe(24);
    expect(markerCount('aprilgrid', 5, 7)).toBe(35);
    expect(markerCount('aprilgrid', 9, 12)).toBe(108);
  });
});

describe('findCharucoSize / findAprilGridSize', () => {
  it('finds by exact label', () => {
    expect(findCharucoSize('300 × 200')?.rows).toBe(7);
  });
  it('normalises x vs ×', () => {
    expect(findCharucoSize('300x200')?.rows).toBe(7);
  });
  it('normalises whitespace', () => {
    expect(findCharucoSize('300  ×  200')?.rows).toBe(7);
  });
  it('returns undefined for unknown', () => {
    expect(findCharucoSize('999 × 999')).toBeUndefined();
  });
  it('finds aprilgrid by label', () => {
    expect(findAprilGridSize('300 × 200')?.rows).toBe(5);
  });
});
