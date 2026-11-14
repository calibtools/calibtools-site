import { describe, it, expect } from 'vitest';
import { getProductData } from './productData';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('getProductData', () => {
  it('returns null for unknown handle', () => {
    expect(getProductData('nonexistent', {})).toBeNull();
  });

  it('parses CT-DS-CHA-C (ceramic) correctly', () => {
    const data = getProductData('charuco-ceramic', {});
    expect(data).not.toBeNull();
    if (!data) return;

    expect(data.datasheetCode).toBe('CT-DS-CHA-C');
    expect(data.rev).toBe('A');
  });

  it('positioning is first sentence and ≤ 25 words', () => {
    const data = getProductData('charuco-ceramic', {});
    expect(data).not.toBeNull();
    if (!data) return;

    expect(data.positioning).toContain('Lithographed');
    const words = data.positioning.split(/\s+/);
    expect(words.length).toBeLessThanOrEqual(25);
  });

  it('parses 4 ordering rows from ceramic datasheet', () => {
    const data = getProductData('charuco-ceramic', {});
    expect(data).not.toBeNull();
    if (!data) return;

    expect(data.orderingRows).toHaveLength(4);
    expect(data.orderingRows[0].partNumber).toContain('CT-CHA-C-110X85');
    expect(data.orderingRows[0].size).toContain('110');
    expect(data.orderingRows[0].corners).toBe('54');
    expect(data.orderingRows[3].partNumber).toContain('CT-CHA-C-230X140');
  });

  it('parses spec groups with expected headings', () => {
    const data = getProductData('charuco-ceramic', {});
    expect(data).not.toBeNull();
    if (!data) return;

    const groupTitles = data.specGroups.map((g) => g.title);
    expect(groupTitles).toContain('Geometry');
    expect(groupTitles).toContain('Physical');
    expect(groupTitles).toContain('Environment');
    expect(groupTitles).toContain('Deliverables');
  });

  it('Geometry group has feature position accuracy row', () => {
    const data = getProductData('charuco-ceramic', {});
    if (!data) return;
    const geom = data.specGroups.find((g) => g.title === 'Geometry');
    expect(geom).toBeDefined();
    const accuracy = geom!.rows.find((r) => r.label === 'Feature position accuracy');
    expect(accuracy).toBeDefined();
    expect(accuracy!.value).toContain('±2 µm (target;');
  });

  it('metafields override datasheet values', () => {
    const data = getProductData('charuco-ceramic', {
      feature_tolerance: '±3 µm (custom)',
    });
    if (!data) return;
    const geom = data.specGroups.find((g) => g.title === 'Geometry');
    const accuracy = geom?.rows.find((r) => r.label === 'Feature position accuracy');
    expect(accuracy?.value).toBe('±3 µm (custom)');
  });

  it('parses composite datasheet', () => {
    const data = getProductData('charuco-composite', {});
    expect(data).not.toBeNull();
    if (!data) return;
    expect(data.datasheetCode).toBe('CT-DS-CHA-P');
  });

  it('parses checkerboard datasheet', () => {
    const data = getProductData('checkerboard-composite', {});
    expect(data).not.toBeNull();
    if (!data) return;
    expect(data.datasheetCode).toBe('CT-DS-CHT-P');
  });
});

describe('ordering tables for every pattern (C6)', () => {
  it('checkerboard: the {F|C} row is split into a Fine and a Coarse row with whole part numbers', () => {
    const d = getProductData('checkerboard-composite', {})!;
    const t = d.orderingTables[0];
    expect(t.header).toEqual(['Part number', 'Size (W × H)', 'Grid', 'Squares · size']);
    expect(t.rows.length).toBe(10);
    expect(t.rows[0]).toEqual(['CT-CHT-P-200X150-F', '200 × 150 mm', 'Fine', '7 × 10 · 18 mm']);
    expect(t.rows[1]).toEqual(['CT-CHT-P-200X150-C', '200 × 150 mm', 'Coarse', '5 × 7 · 25 mm']);
    for (const r of t.rows) expect(r[0]).toMatch(/^CT-CHT-P-\d+X\d+-[FC]$/);
    // No leftovers of the markdown escape anywhere
    expect(JSON.stringify(d.orderingTables)).not.toMatch(/\\\\|\{F/);
  });

  it('AprilGrid: one table with the datasheet columns', () => {
    const d = getProductData('aprilgrid-composite', {})!;
    expect(d.orderingTables.length).toBe(1);
    expect(d.orderingTables[0].header).toEqual(['Part number', 'Size (W × H)', 'Tags (rows × cols)', 'Tag / gap', 'Markers']);
    expect(d.orderingTables[0].rows[2]).toEqual(['CT-APR-P-400X300-T36', '400 × 300 mm', '6 × 8', '35 / 10.5 mm', '48']);
    expect(d.specGroups.map((g) => g.title)).toContain('Geometry');
  });

  it('circle grid: symmetric and asymmetric tables, each with its title', () => {
    const d = getProductData('circlegrid-composite', {})!;
    expect(d.orderingTables.map((t) => t.title)).toEqual(['Symmetric (SYM)', 'Asymmetric (ASYM)']);
    expect(d.orderingTables[0].rows.length).toBe(5);
    expect(d.orderingTables[1].rows[0][0]).toBe('CT-CIR-P-200X150-ASY');
  });

  it('ChArUco: columns that are empty in most rows are dropped; the dictionary placeholder stays in the part number', () => {
    const d = getProductData('charuco-ceramic', {})!;
    const t = d.orderingTables[0];
    expect(t.header).not.toContain('Dictionary');
    expect(t.header).toEqual(['Part number', 'Size (W × H)', 'Squares (rows × cols)', 'Square / marker', 'Corners', 'Markers']);
    expect(t.rows[0][0]).toBe('CT-CHA-C-110X85-{DICT}');
  });

  it('every part number in the tables of APR, CIR and CHT is an active part number', () => {
    const csv = readFileSync(resolve(process.cwd(), 'data/part-numbers.csv'), 'utf-8');
    for (const h of ['checkerboard-composite', 'aprilgrid-composite', 'circlegrid-composite']) {
      for (const t of getProductData(h, {})!.orderingTables) for (const r of t.rows) expect(csv, r[0]).toContain(`${r[0]},active`);
    }
  });

  it('typed rows keep working for the pages that use them', () => {
    const d = getProductData('charuco-composite', {})!;
    expect(d.orderingRows.length).toBe(5);
    expect(d.orderingRows[0].partNumber).toBe('CT-CHA-P-200X150-{DICT}');
  });
});

describe('spec values are plain text, and file lists match the exporters', () => {
  const files = (handle: string) =>
    getProductData(handle, {})!.specGroups.flatMap((g) => g.rows).find((r) => r.label === 'Files')?.value ?? '';
  it('drops markdown code marks', () => {
    for (const h of ['charuco-composite', 'aprilgrid-composite', 'circlegrid-composite', 'halcon-composite']) {
      expect(files(h)).not.toContain('`');
    }
  });
  it('lists no ROS 2 file for AprilGrid (ROS camera_calibration has no AprilGrid model)', () => {
    expect(files('aprilgrid-composite')).not.toContain('.ros2.yaml');
    expect(files('aprilgrid-composite')).toContain('.kalibr.yaml');
  });
  it('lists the ROS 2 file for the circle grid and no Kalibr file for ChArUco', () => {
    expect(files('circlegrid-composite')).toContain('.ros2.yaml');
    expect(files('charuco-composite')).not.toContain('.kalibr.yaml');
  });
});
