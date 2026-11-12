/**
 * Guide figures.
 *   pnpm guides:figures            writes the SVG files under src/assets/guides/
 *   pnpm guides:figures --pngs     renders the partial-view test images to out/partial-view/ for
 *                                  docs/content/experiments/partial-view-detect.py, which writes
 *                                  src/data/partial-view-detection.json (run it before the first command)
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { renderPatternSvg } from '../src/lib/patterns';
import { patternExtent } from '../src/lib/pageLayout';
import { PARTIAL_VIEW_CASES, PARTIAL_VIEW_VISIBLE, PARTIAL_VIEW_MARGIN, partialViewFigureSvg, usafFigureSvg, kalibrFrameFigureSvg, multiBoardFigureSvg, fillFigureSvg, fillRowsFromGuide, printDefectFigureSvg, printDefectRowsFromGuide, detectionLimitsFigureSvg, detectionLimitsFromGuide, lidarCameraFigureSvg, type PartialViewData } from '../src/lib/guideFigures';

if (process.argv.includes('--pngs')) {
  const pxPerMm = 6, m = PARTIAL_VIEW_MARGIN;
  mkdirSync('out/partial-view', { recursive: true });
  const list = PARTIAL_VIEW_CASES.map((c) => {
    const { bw, bh } = patternExtent(c.spec);
    const W = m + bw * PARTIAL_VIEW_VISIBLE, H = bh + 2 * m; // the frame ends where the board is cut
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>${renderPatternSvg(c.spec, m, m)}</svg>`;
    writeFileSync(`out/partial-view/${c.key}.png`, new Resvg(svg, { fitTo: { mode: 'width', value: Math.round(W * pxPerMm) } }).render().asPng());
    return { key: c.key, type: c.spec.type, rows: c.spec.rows, cols: c.spec.cols, square: c.spec.square, marker: c.spec.marker, dict: c.spec.dict, borderBits: c.spec.borderBits ?? null, margin: m, pxPerMm, visible: PARTIAL_VIEW_VISIBLE };
  });
  writeFileSync('out/partial-view/list.json', JSON.stringify(list, null, 1));
  console.log('wrote out/partial-view/*.png');
} else {
  mkdirSync('src/assets/guides', { recursive: true });
  const data = JSON.parse(readFileSync('src/data/partial-view-detection.json', 'utf8')) as PartialViewData;
  writeFileSync('src/assets/guides/partial-view-detection.svg', partialViewFigureSvg(data));
  writeFileSync('src/assets/guides/usaf-1951-groups-0-3.svg', usafFigureSvg());
  writeFileSync('src/assets/guides/kalibr-aprilgrid-frame.svg', kalibrFrameFigureSvg());
  writeFileSync('src/assets/guides/multi-board-id-ranges.svg', multiBoardFigureSvg());
  const fill = fillRowsFromGuide(readFileSync('src/content/guides/calibration-target-size.md', 'utf8'));
  writeFileSync('src/assets/guides/board-fill-20-vs-60.svg', fillFigureSvg([fill.find((r) => r.fill === 20)!, fill.find((r) => r.fill === 60)!]));
  writeFileSync('src/assets/guides/print-defects-rms-vs-model-error.svg', printDefectFigureSvg(printDefectRowsFromGuide(readFileSync('src/content/guides/printed-target-costs-half-a-pixel.md', 'utf8'))));
  writeFileSync('src/assets/guides/charuco-detection-limits.svg', detectionLimitsFigureSvg(detectionLimitsFromGuide(readFileSync('src/content/guides/corner-detection-troubleshooting.md', 'utf8'))));
  writeFileSync('src/assets/guides/lidar-camera-target-two-views.svg', lidarCameraFigureSvg());
  console.log('wrote src/assets/guides/*.svg');
}
