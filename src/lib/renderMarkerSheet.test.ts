import { describe, it, expect } from 'vitest';
import { renderMarkerSheetSvg } from './renderMarkerSheet';
import type { PatternSpec } from './patterns';

const base: PatternSpec = {
  type: 'Marker sheet' as PatternSpec['type'],
  rows: 2, cols: 3, square: 40, marker: 30,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: false,
};

describe('renderMarkerSheetSvg', () => {
  it('renders correct number of markers', () => {
    const svg = renderMarkerSheetSvg(base, 20, 20);
    const bgRects = svg.match(/class="marker-bg"/g);
    expect(bgRects).toHaveLength(6);
  });

  it('shows ID labels when showTagIds is true', () => {
    const svg = renderMarkerSheetSvg({ ...base, showTagIds: true }, 20, 20);
    const labels = svg.match(/class="marker-id"/g);
    expect(labels).toHaveLength(6);
  });

  it('renders white data cells from dictionary', () => {
    const svg = renderMarkerSheetSvg(base, 20, 20);
    const whiteCells = svg.match(/fill="#fff"/g);
    expect(whiteCells).not.toBeNull();
    expect(whiteCells!.length).toBeGreaterThan(0);
  });

  it('handles startId offset', () => {
    const svg = renderMarkerSheetSvg({ ...base, startId: 10, showTagIds: true }, 20, 20);
    expect(svg).toContain('>10<');
    expect(svg).toContain('>11<');
  });

  it('works with AprilTag family', () => {
    const aprilSpec: PatternSpec = { ...base, dict: '', aprilFamily: '36h11' };
    const svg = renderMarkerSheetSvg(aprilSpec, 20, 20);
    const bgRects = svg.match(/class="marker-bg"/g);
    expect(bgRects).toHaveLength(6);
  });
});
