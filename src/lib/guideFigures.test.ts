import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PARTIAL_VIEW_CASES, PARTIAL_VIEW_VISIBLE, partialViewFigureSvg, usafFigureSvg, kalibrFrameFigureSvg, multiBoardFigureSvg, KALIBR_FIGURE_SPEC, MULTI_BOARD_SPECS, fillFigureSvg, fillRowsFromGuide, FILL_FIGURE_SPEC, printDefectFigureSvg, printDefectRowsFromGuide, PRINT_DEFECT_SCALE, detectionLimitsFigureSvg, detectionLimitsFromGuide, lidarCameraFigureSvg, LIDAR_SKETCH, type PartialViewData } from './guideFigures';
import { idRange } from './idRange';
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
  it('Kalibr AprilGrid frame figure', () => {
    expect(readFileSync('src/assets/guides/kalibr-aprilgrid-frame.svg', 'utf8')).toBe(kalibrFrameFigureSvg());
  });
  it('multi-board ID ranges figure', () => {
    expect(readFileSync('src/assets/guides/multi-board-id-ranges.svg', 'utf8')).toBe(multiBoardFigureSvg());
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

describe('Kalibr frame figure', () => {
  const svg = kalibrFrameFigureSvg();
  const tags = aprilGridTags(KALIBR_FIGURE_SPEC);
  it('labels every tag with its ID, 0 in the bottom row and the highest in the top row', () => {
    const labels = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)" text-anchor="middle" font-size="7.5"[^>]*>(\d+)<\/text>/g)].map((m) => ({ x: +m[1], y: +m[2], id: +m[3] }));
    expect(labels.map((l) => l.id).sort((a, b) => a - b)).toEqual(tags.map((t) => t.id));
    const y = (id: number) => labels.find((l) => l.id === id)!.y, x = (id: number) => labels.find((l) => l.id === id)!.x;
    expect(y(0)).toBeGreaterThan(y(4)); expect(y(4)).toBeGreaterThan(y(8)); // upward
    expect(x(1)).toBeGreaterThan(x(0)); expect(y(1)).toBe(y(0));           // left to right
  });
  it('puts the origin dot on the bottom-left corner of tag 0', () => {
    const dot = /<circle cx="([\d.]+)" cy="([\d.]+)" r="2.6"/.exec(svg)!;
    const t0 = /class="tag-bg"/.test(svg) ? [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="40" height="40" class="tag-bg"/g)].map((m) => ({ x: +m[1], y: +m[2] })) : [];
    const lowestLeft = t0.sort((a, b) => b.y - a.y || a.x - b.x)[0];
    expect(+dot[1]).toBeCloseTo(lowestLeft.x, 6);
    expect(+dot[2]).toBeCloseTo(lowestLeft.y + 40, 6);
  });
});

describe('multi-board figure', () => {
  it('shows ranges that follow from the boards and do not overlap', () => {
    const svg = multiBoardFigureSvg();
    let next = 0;
    MULTI_BOARD_SPECS.forEach((s, i) => {
      const r = idRange(s)!;
      expect(r.min).toBe(next); next = r.max + 1;
      expect(svg).toContain(`>Board ${i + 1}<`);
      expect(svg).toContain(`start ID ${r.min} · IDs ${r.min}–${r.max}<`);
    });
    expect(next).toBeLessThanOrEqual(250); // fits DICT_6X6_250
    const md = readFileSync('src/content/guides/multi-board-marker-ids.md', 'utf8');
    expect(md).toContain('board 4 uses 105 to 139');
  });
});

describe('board fill figure', () => {
  const md = readFileSync('src/content/guides/calibration-target-size.md', 'utf8');
  const rows = fillRowsFromGuide(md);
  const pair: [typeof rows[0], typeof rows[0]] = [rows.find((r) => r.fill === 20)!, rows.find((r) => r.fill === 60)!];
  it('reads the five rows of the guide\'s table', () => {
    expect(rows.map((r) => r.fill)).toEqual([20, 30, 45, 60, 80]);
    expect(pair[0]).toEqual({ fill: 20, pxPerSquare: 28, cornerErrorPx: 13 });
    expect(pair[1]).toEqual({ fill: 60, pxPerSquare: 83, cornerErrorPx: 1.4 });
  });
  it('is the file this code writes, with the table\'s numbers', () => {
    const svg = fillFigureSvg(pair);
    expect(readFileSync('src/assets/guides/board-fill-20-vs-60.svg', 'utf8')).toBe(svg);
    expect(svg).toContain('28 px per square · 13 px error at the frame corners');
    expect(svg).toContain('83 px per square · 1.4 px error at the frame corners');
  });
  it('draws the board at the stated share of the frame width', () => {
    const svg = fillFigureSvg(pair);
    const frames = [...svg.matchAll(/<rect x="([\d.]+)" y="14" width="([\d.]+)" height="[\d.]+" fill="#F4F3EF"/g)].map((m) => +m[2]);
    const scales = [...svg.matchAll(/scale\(([\d.]+)\)/g)].map((m) => +m[1]);
    const boardW = FILL_FIGURE_SPEC.cols * FILL_FIGURE_SPEC.square;
    expect((boardW * scales[0]) / frames[0]).toBeCloseTo(0.2, 3);
    expect((boardW * scales[1]) / frames[1]).toBeCloseTo(0.6, 3);
  });
  it('the table itself is consistent with fill as a share of width: pixels per square scale with fill', () => {
    // 14 squares across: frame width implied by each row = 14 × px per square / fill. The rows agree within 3 %.
    const implied = rows.map((r) => (14 * r.pxPerSquare) / (r.fill / 100));
    const mean = implied.reduce((a, b) => a + b, 0) / implied.length;
    for (const w of implied) expect(Math.abs(w - mean) / mean).toBeLessThan(0.03);
    expect(md).toContain("Fill here means the board's width as a share of the frame width.");
  });
});

describe('printed-target defects figure', () => {
  const md = readFileSync('src/content/guides/printed-target-costs-half-a-pixel.md', 'utf8');
  const rows = printDefectRowsFromGuide(md);

  it('reads all eleven scenarios of the first results table', () => {
    expect(rows.length).toBe(11);
    expect(rows[0]).toEqual({ label: 'Flat and exact', rms: 0.07, edge: 1 });
    expect(rows.find((r) => r.label === 'Bowed 1 mm')).toEqual({ label: 'Bowed 1 mm', rms: 0.79, edge: 103 });
    expect(rows.find((r) => r.label === 'Stretched 0.5 % in one direction')).toEqual({ label: 'Stretched 0.5 % in one direction', rms: 0.13, edge: 9.7 });
  });

  it('the committed SVG is what the generator produces from the table', () => {
    expect(readFileSync('src/assets/guides/print-defects-rms-vs-model-error.svg', 'utf8')).toBe(printDefectFigureSvg(rows));
  });

  it('every value fits its scale, so no bar is clipped', () => {
    for (const r of rows) {
      expect(r.rms).toBeLessThanOrEqual(PRINT_DEFECT_SCALE.rmsMax);
      expect(r.edge).toBeGreaterThanOrEqual(PRINT_DEFECT_SCALE.edgeMin);
      expect(r.edge).toBeLessThanOrEqual(PRINT_DEFECT_SCALE.edgeMax);
    }
  });

  it('bar lengths follow the numbers: RMS linear, edge error logarithmic', () => {
    const svg = printDefectFigureSvg(rows);
    const ink = [...svg.matchAll(/<rect x="20" y="[\d.]+" width="([\d.]+)" height="16" fill="#141414"/g)].map((m) => +m[1]);
    const red = [...svg.matchAll(/<rect x="336" y="[\d.]+" width="([\d.]+)" height="16" fill="#E60012"/g)].map((m) => +m[1]);
    expect(ink.length).toBe(11);
    expect(red.length).toBe(11);
    const b1 = rows.findIndex((r) => r.label === 'Bowed 1 mm'), b2 = rows.findIndex((r) => r.label === 'Bowed 2 mm');
    expect(ink[b2] / ink[b1]).toBeCloseTo(1.59 / 0.79, 1);
    const { edgeMin, edgeMax, barMax } = PRINT_DEFECT_SCALE;
    expect(red[b1]).toBeCloseTo((Math.log(103 / edgeMin) / Math.log(edgeMax / edgeMin)) * barMax, 0);
  });

  it('the alt text quotes numbers that are in the table', () => {
    const alt = md.match(/!\[([^\]]+)\]\(\.\.\/\.\.\/assets\/guides\/print-defects/)![1];
    expect(alt).toContain('9.7 px');
    expect(alt).toContain('0.79 px');
    expect(alt).toContain('103 px');
  });
});

describe('ChArUco detection limits figure', () => {
  const md = readFileSync('src/content/guides/corner-detection-troubleshooting.md', 'utf8');
  const d = detectionLimitsFromGuide(md);

  it('reads the pixel and blur tables and nothing else', () => {
    expect(d.total).toBe(54);
    expect(d.pixels.map((r) => [r.pxPerSquare, r.pxPerBit, r.corners])).toEqual([[30, 2.7, 54], [24, 2.2, 54], [20, 1.8, 52], [16, 1.4, 3], [12, 1.1, 0], [8, 0.7, 0]]);
    expect([d.smallBit, d.largeBit]).toEqual([2.7, 5.4]);
    expect(d.blur.map((r) => [r.sigma, r.small, r.large])).toEqual([[0, 54, 54], [1, 46, 54], [2, 0, 50], [3, 0, 1], [6, 0, 0], [8, 0, 0]]);
  });

  it('the committed SVG is what the generator produces from the tables', () => {
    expect(readFileSync('src/assets/guides/charuco-detection-limits.svg', 'utf8')).toBe(detectionLimitsFigureSvg(d));
  });

  it('no count exceeds the total, so no bar leaves its track', () => {
    for (const r of d.pixels) expect(r.corners).toBeLessThanOrEqual(d.total);
    for (const r of d.blur) { expect(r.small).toBeLessThanOrEqual(d.total); expect(r.large).toBeLessThanOrEqual(d.total); }
  });

  it('the checkerboard sentence is only drawn because every row of the first table says found', () => {
    expect(d.pixels.every((r) => r.checkerboard === 'found')).toBe(true);
    expect(detectionLimitsFigureSvg(d)).toContain('down to 8 px per square');
  });

  it('the alt text quotes numbers from the tables', () => {
    const alt = md.match(/!\[([^\]]+)\]\(\.\.\/\.\.\/assets\/guides\/charuco-detection-limits/)![1];
    for (const t of ['out of 54', 'All 54 at 2.2 px per bit', '3 at 1.4 px', 'With 2.7 px bits a blur of sigma 2 px leaves none', 'with 5.4 px bits it leaves 50']) expect(alt).toContain(t);
  });
});

describe('LiDAR-camera figure', () => {
  const svg = lidarCameraFigureSvg();
  const { panel, holes, holeR, marker, inset } = LIDAR_SKETCH;

  it('the committed SVG is what the generator produces', () => {
    expect(readFileSync('src/assets/guides/lidar-camera-target-two-views.svg', 'utf8')).toBe(svg);
  });

  it('no LiDAR point is drawn inside a hole, and the hole centers are marked in both views', () => {
    const pts = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="1.3"/g)].map((m) => [+m[1] - 25, +m[2] - 64]);
    expect(pts.length).toBeGreaterThan(400);
    for (const [x, y] of pts) for (const [hx, hy] of holes) expect(Math.hypot(x - hx, y - hy)).toBeGreaterThanOrEqual(holeR);
    expect((svg.match(/stroke="#B3000E" stroke-width="1.6"/g) ?? []).length).toBe(holes.length * 2 * 2);
  });

  it('the hole layout is not symmetric under a half turn, as the guide asks for', () => {
    const turned = holes.map(([x, y]) => [panel.w - x, panel.h - y]);
    const same = turned.every(([x, y]) => holes.some(([hx, hy]) => Math.hypot(x - hx, y - hy) < 1));
    expect(same).toBe(false);
    expect(readFileSync('src/content/guides/lidar-camera-calibration.md', 'utf8')).toContain('An asymmetric hole layout');
  });

  it('holes stay clear of the markers and of the panel edge', () => {
    const boxes = [[inset, inset], [panel.w - inset - marker, inset], [inset, panel.h - inset - marker], [panel.w - inset - marker, panel.h - inset - marker]];
    for (const [hx, hy] of holes) {
      expect(hx - holeR).toBeGreaterThan(0); expect(hx + holeR).toBeLessThan(panel.w);
      expect(hy - holeR).toBeGreaterThan(0); expect(hy + holeR).toBeLessThan(panel.h);
      for (const [bx, by] of boxes) {
        const dx = Math.max(bx - hx, 0, hx - (bx + marker)), dy = Math.max(by - hy, 0, hy - (by + marker));
        expect(Math.hypot(dx, dy)).toBeGreaterThan(holeR);
      }
    }
  });
});
