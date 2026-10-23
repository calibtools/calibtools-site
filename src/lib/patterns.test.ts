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

describe('checkerboard finder markers', () => {
  it('finder markers adds 3 circles at CALIB_CB_MARKER positions', () => {
    const spec: PatternSpec = {
      type: 'Checkerboard', rows: 7, cols: 10, square: 25, marker: 18,
      dict: '', paper: 'A4', startId: 0, scaleBar: false,
      finderMarkers: true,
    };
    const svg = checkerboardSvg(spec, 210, 297);
    const circles = svg.match(/<circle[^>]*class="finder-marker"[^>]*\/>/g);
    expect(circles).toHaveLength(3);
  });
});

describe('checkerboard invert', () => {
  it('invert swaps which squares are black', () => {
    const normal: PatternSpec = {
      type: 'Checkerboard', rows: 4, cols: 4, square: 25, marker: 18,
      dict: '', paper: 'A4', startId: 0, scaleBar: false,
    };
    const inverted: PatternSpec = { ...normal, invert: true };
    const svgN = checkerboardSvg(normal, 210, 297);
    const svgI = checkerboardSvg(inverted, 210, 297);
    // Both should have same number of black rects (just in different positions)
    const countN = (svgN.match(/fill="#000"/g) || []).length;
    const countI = (svgI.match(/fill="#000"/g) || []).length;
    expect(countN).toBe(countI);
    // But the SVG should be different
    expect(svgN).not.toBe(svgI);
  });
});

describe('ChArUco real marker bits', () => {
  it('uses dictionary data for marker rendering (not pseudo-random)', () => {
    const spec: PatternSpec = {
      type: 'ChArUco', rows: 3, cols: 4, square: 30, marker: 22,
      dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: false,
    };
    const svg = checkerboardSvg(spec, 210, 297);
    // Should have white cells from real dictionary data
    const whiteRects = svg.match(/<rect[^>]*fill="#fff"[^>]*\/>/g);
    expect(whiteRects).not.toBeNull();
    expect(whiteRects!.length).toBeGreaterThan(0);
  });

  it('renders without errors when dict is not found', () => {
    const spec: PatternSpec = {
      type: 'ChArUco', rows: 3, cols: 4, square: 30, marker: 22,
      dict: 'NONEXISTENT', paper: 'A4', startId: 0, scaleBar: false,
    };
    const svg = checkerboardSvg(spec, 210, 297);
    expect(svg).toContain('</svg>');
  });

  it('marker count matches expected for 3x4 ChArUco', () => {
    // 3x4 grid, white squares have markers
    // (0,1),(0,3),(1,0),(1,2),(2,1),(2,3) = 6 white squares = 6 markers
    const spec: PatternSpec = {
      type: 'ChArUco', rows: 3, cols: 4, square: 30, marker: 22,
      dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: false,
    };
    const svg = checkerboardSvg(spec, 210, 297);
    // Each marker has a black background rect (22mm wide inside white squares)
    const markerBgs = svg.match(new RegExp(`width="${22}" height="${22}"`, 'g'));
    expect(markerBgs).toHaveLength(6);
  });
});

describe('parseTagIdList', () => {
  it('returns sequential IDs from startId when input is undefined', async () => {
    const { parseTagIdList } = await import('./renderAprilGrid');
    expect(parseTagIdList(undefined, 5, 4)).toEqual([5, 6, 7, 8]);
  });

  it('parses "0-9,15,20-24" correctly', async () => {
    const { parseTagIdList } = await import('./renderAprilGrid');
    const ids = parseTagIdList('0-9,15,20-24', 0, 16);
    expect(ids).toEqual([0,1,2,3,4,5,6,7,8,9,15,20,21,22,23,24]);
  });

  it('pads with sequential IDs if list is too short', async () => {
    const { parseTagIdList } = await import('./renderAprilGrid');
    const ids = parseTagIdList('5,10', 0, 5);
    expect(ids).toEqual([5, 10, 11, 12, 13]);
  });

  it('plain number string uses that as start ID', async () => {
    const { parseTagIdList } = await import('./renderAprilGrid');
    expect(parseTagIdList('10', 0, 3)).toEqual([10, 11, 12]);
  });
});

describe('AprilGrid rendering', () => {
  it('renders tag-bg rects for each grid position', () => {
    const spec: PatternSpec = {
      type: 'AprilGrid (Kalibr)', rows: 3, cols: 4, square: 30, marker: 22,
      dict: '', paper: 'A4', startId: 0, scaleBar: false,
      aprilFamily: '36h11', borderBits: 2, tagSpacing: 0.3,
    };
    const svg = checkerboardSvg(spec, 210, 297);
    const tagBgs = svg.match(/class="tag-bg"/g);
    expect(tagBgs).toHaveLength(12); // 3×4 tags
  });

  it('showTagIds adds text labels', () => {
    const spec: PatternSpec = {
      type: 'AprilGrid (Kalibr)', rows: 2, cols: 3, square: 30, marker: 22,
      dict: '', paper: 'A4', startId: 0, scaleBar: false,
      aprilFamily: '36h11', borderBits: 2, tagSpacing: 0.3, showTagIds: true,
    };
    const svg = checkerboardSvg(spec, 210, 297);
    const idLabels = svg.match(/class="tag-id"/g);
    expect(idLabels).not.toBeNull();
    expect(idLabels!.length).toBe(6); // 2×3 tags
  });

  it('symmetric corners adds corner-square rects', () => {
    const spec: PatternSpec = {
      type: 'AprilGrid (Kalibr)', rows: 2, cols: 3, square: 30, marker: 22,
      dict: '', paper: 'A4', startId: 0, scaleBar: false,
      aprilFamily: '36h11', borderBits: 2, tagSpacing: 0.3, symmetricCorners: true,
    };
    const svg = checkerboardSvg(spec, 210, 297);
    const corners = svg.match(/class="corner-square"/g);
    // (rows+1) × (cols+1) = 3 × 4 = 12 corner squares
    expect(corners).toHaveLength(12);
  });

  it('Kalibr preset values produce valid SVG', () => {
    const spec: PatternSpec = {
      type: 'AprilGrid (Kalibr)', rows: 6, cols: 6, square: 30, marker: 22,
      dict: '', paper: 'A3', startId: 0, scaleBar: true,
      aprilFamily: '36h11', borderBits: 2, tagSpacing: 0.3, symmetricCorners: true,
    };
    const svg = checkerboardSvg(spec, 297, 420);
    expect(svg).toContain('</svg>');
    const tagBgs = svg.match(/class="tag-bg"/g);
    expect(tagBgs).toHaveLength(36);
  });
});

describe('checkerboard Radon (rounded)', () => {
  it('Radon checkers adds rx/ry attributes to squares', () => {
    const spec: PatternSpec = {
      type: 'Checkerboard', rows: 4, cols: 4, square: 25, marker: 18,
      dict: '', paper: 'A4', startId: 0, scaleBar: false,
      radonCheckers: true,
    };
    const svg = checkerboardSvg(spec, 210, 297);
    expect(svg).toContain('rx="');
    expect(svg).toContain('ry="');
  });
});
