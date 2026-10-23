import { describe, it, expect } from 'vitest';
import { innerCorners, checkerboardSvg, type PatternSpec } from './patterns';

describe('innerCorners', () => {
  it('matches OpenCV count and order for 7x10, 25 mm', () => {
    const pts = innerCorners(7, 10, 25);
    expect(pts).toHaveLength(54);
    expect(pts[0]).toEqual([25, 25]);
    expect(pts[8]).toEqual([225, 25]);
    expect(pts[9]).toEqual([25, 50]);
  });
});

describe('checkerboardSvg', () => {
  it('declares the page in mm with a 1:1 viewBox', () => {
    const svg = checkerboardSvg({ type: 'Checkerboard', rows: 7, cols: 10, square: 25, marker: 18, dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true }, 210, 297);
    expect(svg).toContain('width="210mm"');
    expect(svg).toContain('viewBox="0 0 210 297"');
    expect(svg).toContain('width="100" height="0.6"');
  });
});

describe('checkerboardSvg brand group', () => {
  const spec = {
    type: 'ChArUco' as const, rows: 7, cols: 10, square: 25, marker: 18,
    dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
  };

  it('contains <g id="calibtools-brand">', () => {
    const svg = checkerboardSvg(spec, 210, 297);
    expect(svg).toContain('id="calibtools-brand"');
  });

  it('brand group has ≥ 9 logo rects', () => {
    const svg = checkerboardSvg(spec, 210, 297);
    const match = svg.match(/<g id="calibtools-brand">([\s\S]*?)<\/g>/);
    expect(match).not.toBeNull();
    const rects = match![1].match(/<rect /g);
    expect(rects!.length).toBeGreaterThanOrEqual(9);
  });

  it('brand group contains wordmark text with font fallback', () => {
    const svg = checkerboardSvg(spec, 210, 297);
    const match = svg.match(/<g id="calibtools-brand">([\s\S]*?)<\/g>/);
    expect(match![1]).toContain('calib');
    expect(match![1]).toContain('.tools');
    expect(match![1]).toContain('font-family');
  });

  it('brand group contains outlined wordmark path', () => {
    const svg = checkerboardSvg(spec, 210, 297);
    const match = svg.match(/<g id="calibtools-brand">([\s\S]*?)<\/g>/);
    expect(match![1]).toContain('<path');
  });

  it('brand group is after pattern rects', () => {
    const svg = checkerboardSvg(spec, 210, 297);
    const brandStart = svg.indexOf('<g id="calibtools-brand">');
    const patternRects = [...svg.matchAll(/<rect x="[^"]*" y="[^"]*" width="[^"]*" height="[^"]*" fill="#000"/g)];
    const lastPatternRect = patternRects[patternRects.length - 1];
    expect(brandStart).toBeGreaterThan(lastPatternRect.index!);
  });
});

describe('PatternSpec new optional fields', () => {
  it('new optional fields default to undefined when not provided', () => {
    const spec: PatternSpec = {
      type: 'Checkerboard', rows: 7, cols: 10, square: 25, marker: 18,
      dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
    };
    expect(spec.finderMarkers).toBeUndefined();
    expect(spec.radonCheckers).toBeUndefined();
    expect(spec.invert).toBeUndefined();
    expect(spec.legacyLayout).toBeUndefined();
    expect(spec.aprilFamily).toBeUndefined();
    expect(spec.borderBits).toBeUndefined();
    expect(spec.tagSpacing).toBeUndefined();
    expect(spec.showTagIds).toBeUndefined();
    expect(spec.symmetricCorners).toBeUndefined();
    expect(spec.tagIdList).toBeUndefined();
    expect(spec.circleDiameter).toBeUndefined();
    expect(spec.circleSpacingX).toBeUndefined();
    expect(spec.circleSpacingY).toBeUndefined();
    expect(spec.showAxes).toBeUndefined();
    expect(spec.monochromeAxes).toBeUndefined();
  });

  it('existing code still works when new fields are set', () => {
    const spec: PatternSpec = {
      type: 'Checkerboard', rows: 4, cols: 4, square: 25, marker: 18,
      dict: '', paper: 'A4', startId: 0, scaleBar: false,
      finderMarkers: true, radonCheckers: true, invert: true,
    };
    // Should not throw — renderers should tolerate these fields
    const svg = checkerboardSvg(spec, 210, 297);
    expect(svg).toContain('</svg>');
  });
});
