import { describe, it, expect } from 'vitest';
import { ogSvg, wrapTitle, placeSvg, OG_W, OG_H } from './ogImage';
import { drawingForPartNumber } from './boardDrawing';

describe('wrapTitle', () => {
  it('breaks at spaces and keeps every word', () => {
    const lines = wrapTitle('ChArUco Calibration Target, Aluminum Composite', 19);
    expect(lines).toEqual(['ChArUco Calibration', 'Target, Aluminum', 'Composite']);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(19);
  });
  it('keeps a single long word whole', () => {
    expect(wrapTitle('Supercalifragilistic', 8)).toEqual(['Supercalifragilistic']);
  });
});

describe('placeSvg', () => {
  it('re-homes a drawing into a box and keeps its viewBox', () => {
    const out = placeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img"><rect/></svg>', 10, 20, 300, 200);
    expect(out).toBe('<svg x="10" y="20" width="300" height="200" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet"><rect/></svg>');
  });
});

describe('ogSvg', () => {
  const svg = ogSvg({ label: 'Calibration target', title: 'Depth & ToF <Camera> Targets', sub: 'Known depth steps to check your depth camera', note: 'CT-X' });

  it('is 1200 × 630 on the paper ground with a white sheet', () => {
    expect(svg).toContain(`width="${OG_W}" height="${OG_H}"`);
    expect(svg).toContain('fill="#F4F3EF"');
    expect(svg).toContain('fill="#FFFFFF"');
  });
  it('escapes text and writes the label in capitals', () => {
    expect(svg).toContain('Depth &amp; ToF &lt;Camera&gt; Targets');
    expect(svg).toContain('CALIBRATION TARGET');
  });
  it('follows the drawing-sheet rules: no gradient, no shadow, red only as text color here', () => {
    expect(svg).not.toMatch(/gradient|filter=|drop-shadow/i);
    expect(svg).not.toMatch(/micron|precision/i);
  });
  it('places a line drawing when given one', () => {
    const withDrawing = ogSvg({ label: 'Calibration target', title: 'ChArUco', drawing: drawingForPartNumber('CT-CHA-P-400X300-D5')! });
    expect(withDrawing.match(/<svg /g)!.length).toBeGreaterThanOrEqual(2);
    expect(withDrawing).toContain('data-dim');
  });
});
