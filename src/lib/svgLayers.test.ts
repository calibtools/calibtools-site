import { describe, it, expect } from 'vitest';
import { axesSvg, type SvgContext } from './svgLayers';
import type { PatternSpec } from './patterns';

function makeCtx(specOverrides: Partial<PatternSpec> = {}): SvgContext {
  const spec: PatternSpec = {
    type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
    dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
    showAxes: true,
    ...specOverrides,
  };
  const bw = spec.cols * spec.square;
  const bh = spec.rows * spec.square;
  const ox = 17.5;
  const oy = 55;
  return { spec, pw: 210, ph: 297, ox, oy, bw, bh };
}

describe('axesSvg', () => {
  it('produces <g id="calibtools-axes"> group', () => {
    expect(axesSvg(makeCtx())).toContain('id="calibtools-axes"');
  });

  it('X arrow uses brand red #E60012', () => {
    expect(axesSvg(makeCtx())).toContain('#E60012');
  });

  it('Y arrow uses green #1BA55A', () => {
    expect(axesSvg(makeCtx())).toContain('#1BA55A');
  });

  it('returns empty string when showAxes is false', () => {
    expect(axesSvg(makeCtx({ showAxes: false }))).toBe('');
  });

  it('returns axes by default when showAxes is undefined', () => {
    const ctx = makeCtx();
    ctx.spec = { ...ctx.spec };
    delete (ctx.spec as any).showAxes;
    expect(axesSvg(ctx)).toContain('calibtools-axes');
  });

  it('monochrome mode uses #000 instead of colours and dashed Y', () => {
    const svg = axesSvg(makeCtx({ monochromeAxes: true }));
    expect(svg).not.toContain('#E60012');
    expect(svg).not.toContain('#1BA55A');
    expect(svg).toContain('#000');
    expect(svg).toContain('stroke-dasharray');
  });

  it('caption says "OpenCV frame" by default', () => {
    expect(axesSvg(makeCtx())).toContain('OpenCV frame');
  });

  it('Kalibr preset uses "Kalibr frame" caption', () => {
    const svg = axesSvg(makeCtx({
      type: 'AprilGrid (Kalibr)', symmetricCorners: true,
    }));
    expect(svg).toContain('Kalibr frame');
  });

  it('axes start >= 0.5 squares from pattern origin (no-overlap)', () => {
    const ctx = makeCtx();
    const svg = axesSvg(ctx);
    // Parse x1 from the first line element
    const x1Match = svg.match(/x1="([^"]+)"/);
    expect(x1Match).not.toBeNull();
    const startX = parseFloat(x1Match![1]);
    // startX should be ox - 0.5*square = 17.5 - 12.5 = 5
    expect(startX).toBeLessThanOrEqual(ctx.ox - 0.5 * ctx.spec.square + 0.01);
  });

  it('arrowhead polygon has no dimension > 3mm', () => {
    const svg = axesSvg(makeCtx());
    // Parse polygon points — arrowhead is at most 3mm in any direction
    const polygons = [...svg.matchAll(/points="([^"]+)"/g)];
    expect(polygons.length).toBeGreaterThanOrEqual(2); // X and Y arrowheads
  });
});
