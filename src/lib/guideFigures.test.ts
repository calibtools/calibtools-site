import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PARTIAL_VIEW_CASES, PARTIAL_VIEW_VISIBLE, partialViewFigureSvg, usafFigureSvg, type PartialViewData } from './guideFigures';
import { patternExtent } from './pageLayout';
import { charucoMarkers } from './renderCharuco';
import { innerCorners } from './patterns';
import { aprilGridTags } from './renderAprilGrid';

const data = JSON.parse(readFileSync('src/data/partial-view-detection.json', 'utf8')) as PartialViewData;
const result = (k: string) => data.results.find((r) => r.key === k)!;

describe('guide figures are the files this code writes', () => {
  it('partial-view figure', () => {
    expect(readFileSync('src/assets/guides/partial-view-detection.svg', 'utf8')).toBe(partialViewFigureSvg(data));
  });
  it('USAF 1951 figure', () => {
    expect(readFileSync('src/assets/guides/usaf-1951-groups-0-3.svg', 'utf8')).toBe(usafFigureSvg());
  });
});

describe('partial-view detection data', () => {
  it('was measured for the figure\'s boards and visible share', () => {
    expect(data.visible).toBe(PARTIAL_VIEW_VISIBLE);
    expect(data.results.map((r) => r.key)).toEqual(PARTIAL_VIEW_CASES.map((c) => c.key));
    expect(data.opencv).toMatch(/^\d+\.\d+/);
  });

  it('checkerboard: not found', () => {
    expect(result('checkerboard')).toMatchObject({ found: false, points: [] });
  });

  it('ChArUco: every returned point is an inner corner of the board, inside the frame', () => {
    const c = PARTIAL_VIEW_CASES[1], { bw } = patternExtent(c.spec);
    const corners = innerCorners(c.spec.rows, c.spec.cols, c.spec.square);
    expect(charucoMarkers(c.spec).length).toBe(35);
    const pts = result('charuco').points;
    expect(pts.length).toBeGreaterThan(0);
    for (const [x, y] of pts) {
      expect(x).toBeLessThan(bw * PARTIAL_VIEW_VISIBLE);
      expect(corners.some(([kx, ky]) => Math.abs(kx - x) < 0.5 && Math.abs(ky - y) < 0.5)).toBe(true);
    }
  });

  it('AprilGrid: four corners per tag, each on a tag that is completely in view', () => {
    const c = PARTIAL_VIEW_CASES[2], { bw } = patternExtent(c.spec);
    const inView = aprilGridTags(c.spec).filter((t) => t.x + t.size < bw * PARTIAL_VIEW_VISIBLE);
    const pts = result('aprilgrid').points;
    expect(pts.length).toBe(inView.length * 4);
    for (const [x, y] of pts) {
      expect(inView.some((t) => [t.x, t.x + t.size].some((cx) => Math.abs(cx - x) < 0.5) && [t.y, t.y + t.size].some((cy) => Math.abs(cy - y) < 0.5))).toBe(true);
    }
  });

  it('the guide states the measured numbers', () => {
    const md = readFileSync('src/content/guides/charuco-vs-checkerboard-vs-aprilgrid.md', 'utf8');
    const ch = result('charuco').points.length, ap = result('aprilgrid').points.length;
    expect(md).toContain(`${ch} of ${PARTIAL_VIEW_CASES[1].total} inner corners`);
    expect(md).toContain(`${ap} of ${PARTIAL_VIEW_CASES[2].total} tag corners`);
    expect(md).toContain(`${ap / 4} tags, ${ap} corners`);
    expect(md).toContain(`OpenCV ${data.opencv.split('.').slice(0, 2).join('.')}`);
  });
});
