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
import { PARTIAL_VIEW_CASES, PARTIAL_VIEW_VISIBLE, PARTIAL_VIEW_MARGIN, partialViewFigureSvg, usafFigureSvg, kalibrFrameFigureSvg, multiBoardFigureSvg, boardPlacementFigureSvg, type PlacementData, handEyeRotationFigureSvg, handEyeRotationRows, HAND_EYE_ROTATION_CASES, cameraImuMotionFigureSvg, cameraImuMotionRows, lidarUsableFigureSvg, printDefectFigureSvg, printDefectRowsFromGuide, hiddenErrorFigureSvg, hiddenErrorRowsFromGuide, coverageFigureSvg, handEyeFigureSvg, detectionLimitsFigureSvg, detectionLimitsFromGuide, lidarCameraFigureSvg, boardMotionFigureSvg, boardMotionRowsFromGuide, substrateFigureSvg, substrateRowsFromGuide, sameIdsFigureSvg, imageCountFigureSvg, imageCountRowsFromGuide, type PartialViewData, type SameIdsData } from '../src/lib/guideFigures';

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
  writeFileSync('src/assets/guides/same-ids-detection.svg', sameIdsFigureSvg(JSON.parse(readFileSync('src/data/same-ids-detection.json', 'utf8')) as SameIdsData));
  writeFileSync('src/assets/guides/board-middle-vs-moved.svg', boardPlacementFigureSvg(JSON.parse(readFileSync('src/data/target-size-placement.json', 'utf8')) as PlacementData));
  writeFileSync('src/assets/guides/print-defects-rms-vs-model-error.svg', printDefectFigureSvg(printDefectRowsFromGuide(readFileSync('src/content/guides/printed-target-costs-half-a-pixel.md', 'utf8'))));
  writeFileSync('src/assets/guides/rms-vs-true-error.svg', hiddenErrorFigureSvg(hiddenErrorRowsFromGuide(readFileSync('src/content/guides/reprojection-error.md', 'utf8'))));
  writeFileSync('src/assets/guides/view-coverage.svg', coverageFigureSvg());
  writeFileSync('src/assets/guides/hand-eye-arrangements.svg', handEyeFigureSvg());
  writeFileSync('src/assets/guides/hand-eye-rotation-vs-error.svg', handEyeRotationFigureSvg(handEyeRotationRows(JSON.parse(readFileSync('docs/content/experiments/hand-eye/results/sessions.json', 'utf8')).cases, HAND_EYE_ROTATION_CASES)));
  writeFileSync('src/assets/guides/camera-imu-motion-vs-error.svg', cameraImuMotionFigureSvg(cameraImuMotionRows(JSON.parse(readFileSync('docs/content/experiments/camera-imu/results/recordings.json', 'utf8')).cases)));
  writeFileSync('src/assets/guides/lidar-holes-found-by-distance.svg', lidarUsableFigureSvg(JSON.parse(readFileSync('docs/content/experiments/lidar-camera/results/detect.json', 'utf8')).rows));
  writeFileSync('src/assets/guides/charuco-detection-limits.svg', detectionLimitsFigureSvg(detectionLimitsFromGuide(readFileSync('src/content/guides/corner-detection-troubleshooting.md', 'utf8'))));
  writeFileSync('src/assets/guides/lidar-camera-target-two-views.svg', lidarCameraFigureSvg());
  writeFileSync('src/assets/guides/board-motion-rms-vs-model-error.svg', boardMotionFigureSvg(boardMotionRowsFromGuide(readFileSync('src/content/guides/how-still-calibration-board.md', 'utf8'))));
  writeFileSync('src/assets/guides/substrate-rms-vs-model-error.svg', substrateFigureSvg(substrateRowsFromGuide(readFileSync('src/content/guides/composite-ceramic-or-glass.md', 'utf8'))));
  writeFileSync('src/assets/guides/image-count-rms-vs-model-error.svg', imageCountFigureSvg(imageCountRowsFromGuide(readFileSync('src/content/guides/how-many-calibration-images.md', 'utf8'))));
  console.log('wrote src/assets/guides/*.svg');
}
