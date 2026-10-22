import { describe, it, expect } from 'vitest';
import { innerCorners, checkerboardSvg } from './patterns';

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
