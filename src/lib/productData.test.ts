import { describe, it, expect } from 'vitest';
import { getProductData } from './productData';

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
    expect(data.orderingRows[0].partNumber).toContain('CT-CHA-C-110085');
    expect(data.orderingRows[0].size).toContain('110');
    expect(data.orderingRows[0].corners).toBe('54');
    expect(data.orderingRows[3].partNumber).toContain('CT-CHA-C-230140');
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
    expect(accuracy!.value).toContain('±2 µm');
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
