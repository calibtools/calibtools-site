import { describe, it, expect } from 'vitest';
import { checkerboardSvg, type PatternSpec } from './patterns';
import { exportDxf } from './exportDxf';
import { patternSummary } from './brand';
import { computeLayout } from './pageLayout';

/**
 * The label printed under an AprilGrid names the tag family and the gap that were chosen, in every file
 * format. Reported 2026-11-24: SVG, PNG (rendered from the SVG) and DXF said tag36h11 for a tag16h5 grid,
 * because their label was built from a cut-down copy of the pattern that left the family and the gap out.
 */
const base: PatternSpec = { type: 'AprilGrid (Kalibr)', rows: 5, cols: 6, square: 30, marker: 0, dict: '', paper: 'A3', startId: 0, scaleBar: true, borderBits: 2, tagSpacing: 0.3, symmetricCorners: true };
const CASES: [string, number, string][] = [
  ['16h5', 0.3, 'AprilGrid (Kalibr) 5×6 · 30 mm tags, 9 mm gap · tag16h5 · IDs 0–29'],
  ['16h5', 0.25, 'AprilGrid (Kalibr) 5×6 · 30 mm tags, 7.5 mm gap · tag16h5 · IDs 0–29'],
  ['25h9', 0.4, 'AprilGrid (Kalibr) 5×6 · 30 mm tags, 12 mm gap · tag25h9 · IDs 0–29'],
  ['36h11', 0.3, 'AprilGrid (Kalibr) 5×6 · 30 mm tags, 9 mm gap · tag36h11 · IDs 0–29'],
];

describe.each(CASES)('AprilGrid label, tag%s with gap ratio %s', (aprilFamily, tagSpacing, label) => {
  const spec: PatternSpec = { ...base, aprilFamily, tagSpacing };
  const other = ['16h5', '25h9', '36h11'].filter((f) => f !== aprilFamily);

  it('the label itself (what the PDF prints)', () => {
    expect(patternSummary(spec)).toBe(label);
  });

  it.each([['with the page layout', true], ['without it', false]])('SVG, and so PNG, %s', (_n, withLayout) => {
    const layout = withLayout ? computeLayout(spec, 297, 420) : undefined;
    const svg = checkerboardSvg(spec, layout?.pw ?? 420, layout?.ph ?? 297, layout);
    expect(svg).toContain(label);
    for (const f of other) expect(svg).not.toContain(`tag${f}`);
  });

  it('DXF: the comment line and the text under the board', () => {
    const dxf = exportDxf({ spec, pw: 420, ph: 297 });
    expect(dxf.split('\n').filter((l) => l.includes(label)).length).toBeGreaterThanOrEqual(2);
    for (const f of other) expect(dxf).not.toContain(`tag${f}`);
  });
});
