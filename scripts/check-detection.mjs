#!/usr/bin/env node
/**
 * check-detection.mjs — detection proof for pattern exports.
 *
 * For each test case, generates a PDF, renders at 300 DPI via pdftoppm,
 * and runs the appropriate OpenCV detector via Python child process:
 *
 *   - ChArUco: CharucoDetector → asserts marker IDs + charuco corners
 *   - Checkerboard: findChessboardCornersSB → asserts inner corner count
 *   - Tiled: brand-region scan for zero false positives
 *
 * Assertions:
 *   (i)   detected count == expected
 *   (ii)  every detection inside the pattern bounding box
 *   (iii) zero detections in brand block and axes regions
 *
 * Requirements: python3 with opencv-python-headless, pdftoppm (poppler).
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'docs/audit/2026-10-28-brand-block');

mkdirSync(OUT_DIR, { recursive: true });

function runPython(script) {
  return execFileSync('python3', ['-c', script], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

const CASES = [
  {
    name: 'charuco-6x10-20-a4-landscape',
    spec: {
      type: 'ChArUco', rows: 6, cols: 10, square: 20, marker: 14,
      dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true, showAxes: true,
    },
    paperW: 210, paperH: 297,
    detector: 'charuco',
    description: 'ChArUco 6×10 @ 20 mm, A4 landscape',
  },
  {
    name: 'charuco-7x12-25-tiled-sheet1',
    spec: {
      type: 'ChArUco', rows: 7, cols: 12, square: 25, marker: 18,
      dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true, showAxes: true,
    },
    paperW: 210, paperH: 297,
    tiled: true,
    detector: 'charuco',
    description: 'ChArUco 7×12 @ 25 mm, tiled sheet 1',
  },
  {
    name: 'checkerboard-5x7-15-a4-portrait',
    spec: {
      type: 'Checkerboard', rows: 5, cols: 7, square: 15,
      paper: 'A4', startId: 0, scaleBar: true, showAxes: true,
    },
    paperW: 210, paperH: 297,
    detector: 'chessboard',
    description: 'Checkerboard 5×7 @ 15 mm, A4 portrait',
  },
];

/**
 * Rasterise an SVG string to a PNG file via Playwright headless Chromium.
 * Viewport is sized so 1 mm = 300/25.4 px (true 300 DPI).
 */
async function rasteriseSvgToFile(svgMarkup, pw, ph, outPath) {
  const mmToPx = 300 / 25.4;
  const widthPx = Math.round(pw * mmToPx);
  const heightPx = Math.round(ph * mmToPx);

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: widthPx, height: heightPx },
    deviceScaleFactor: 1,
  });

  // Build a minimal HTML page with the SVG filling the viewport exactly
  const html = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  body { width: ${widthPx}px; height: ${heightPx}px; overflow: hidden; background: #fff; }
  svg { display: block; width: ${widthPx}px; height: ${heightPx}px; }
</style></head><body>${svgMarkup}</body></html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outPath, type: 'png', fullPage: false });
  await browser.close();
}

async function run() {
  const { exportPdf, exportTiledPdf } = await import('../src/lib/exportPdf.ts');
  const { computeLayout, computeTiling } = await import('../src/lib/pageLayout.ts');
  const { checkerboardSvg } = await import('../src/lib/patterns.ts');

  const fontDir = resolve(ROOT, 'src/assets/fonts');
  const fontBytes = {
    regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer,
    semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer,
    mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer,
  };

  const errors = [];
  const results = [];

  // ── SVG & PNG cases (same ChArUco spec, rasterised via Playwright) ────────
  const svgPngSpec = CASES[0].spec; // charuco-6x10-20-a4-landscape
  const svgPngLayout = computeLayout(svgPngSpec, 210, 297);
  const svgMarkup = checkerboardSvg(svgPngSpec, svgPngLayout.pw, svgPngLayout.ph, svgPngLayout);

  const SVG_PNG_CASES = [
    {
      name: 'charuco-6x10-20-svg',
      spec: svgPngSpec,
      paperW: 210, paperH: 297,
      detector: 'charuco',
      description: 'ChArUco 6×10 @ 20 mm, SVG via Playwright',
      format: 'svg',
    },
    {
      name: 'charuco-6x10-20-png',
      spec: svgPngSpec,
      paperW: 210, paperH: 297,
      detector: 'charuco',
      description: 'ChArUco 6×10 @ 20 mm, PNG via Playwright',
      format: 'png',
    },
  ];

  const ALL_CASES = [...CASES, ...SVG_PNG_CASES];

  for (const tc of ALL_CASES) {
    console.log(`\n[check-detection] ${tc.description}`);

    const layout = computeLayout(tc.spec, tc.paperW, tc.paperH);
    let renderedPng;

    if (tc.format === 'svg' || tc.format === 'png') {
      // Rasterise SVG via Playwright headless Chromium at 300 DPI
      const svgPath = resolve(OUT_DIR, `${tc.name}.svg`);
      writeFileSync(svgPath, svgMarkup);
      renderedPng = resolve(OUT_DIR, `${tc.name}.png`);
      try {
        await rasteriseSvgToFile(svgMarkup, layout.pw, layout.ph, renderedPng);
      } catch (e) {
        errors.push(`${tc.name}: Playwright rasterisation failed: ${e.message}`);
        continue;
      }
    } else {
      // PDF path (existing)
      let pdfBytes;

      if (tc.tiled) {
        const bw = tc.spec.cols * tc.spec.square;
        const bh = tc.spec.rows * tc.spec.square;
        const tiling = computeTiling(bw, bh, tc.paperW, tc.paperH);
        pdfBytes = await exportTiledPdf({ spec: tc.spec, tiling, fontBytes });
      } else {
        pdfBytes = await exportPdf({ spec: tc.spec, pw: layout.pw, ph: layout.ph, fontBytes, layout });
      }

      const pdfPath = resolve(OUT_DIR, `${tc.name}.pdf`);
      writeFileSync(pdfPath, pdfBytes);

      const pngBase = resolve(OUT_DIR, tc.name);
      try {
        execFileSync('pdftoppm', ['-r', '300', '-png', '-f', '1', '-l', '1', pdfPath, pngBase], { stdio: 'pipe' });
      } catch (e) {
        errors.push(`${tc.name}: pdftoppm failed: ${e.message}`);
        continue;
      }

      renderedPng = `${pngBase}-1.png`;
      if (!existsSync(renderedPng)) renderedPng = `${pngBase}-01.png`;
      if (!existsSync(renderedPng)) { errors.push(`${tc.name}: PNG not found`); continue; }
    }

    const isTiled = !!tc.tiled;
    const dpi = 300;
    const mmToPx = dpi / 25.4;

    // Pattern bbox in pixels
    const patOx = layout.ox * mmToPx;
    const patOy = layout.oy * mmToPx;
    const patBw = layout.bw * mmToPx;
    const patBh = layout.bh * mmToPx;

    // Brand region
    const brandY = layout.brand.wmY * mmToPx;
    const brandH = (layout.ph - layout.brand.wmY) * mmToPx;

    // Axes region — tight bbox around the axis arrows + labels
    const axesX = (layout.axes.originX - 2) * mmToPx;
    const axesY = (layout.axes.originY - 4) * mmToPx;
    const axesW = (layout.axes.arrowLen + 6) * mmToPx;
    const axesH = (layout.axes.arrowLen + 6) * mmToPx;

    let pyScript;

    if (tc.detector === 'charuco' && !isTiled) {
      // Full CharucoDetector — the real test
      const rows = tc.spec.rows;
      const cols = tc.spec.cols;
      const marker = tc.spec.marker;
      const dictName = tc.spec.dict;
      // Expected markers: white squares in chess grid
      let expectedMarkers = 0;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if ((r + c) % 2 !== 0) expectedMarkers++;
      const expectedCorners = (rows - 1) * (cols - 1);

      pyScript = `
import cv2, numpy as np, json, sys
img = cv2.imread("${renderedPng}")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
dict_id = getattr(cv2.aruco, "${dictName}")
dictionary = cv2.aruco.getPredefinedDictionary(dict_id)
board = cv2.aruco.CharucoBoard((${cols}, ${rows}), ${tc.spec.square}, ${marker}, dictionary)
det_params = cv2.aruco.DetectorParameters()
charuco_params = cv2.aruco.CharucoParameters()
detector = cv2.aruco.CharucoDetector(board, charuco_params, det_params)
charuco_corners, charuco_ids, marker_corners, marker_ids = detector.detectBoard(gray)
result = {"detector": "CharucoDetector"}
result["marker_count"] = 0 if marker_ids is None else len(marker_ids)
result["marker_ids"] = [] if marker_ids is None else sorted(marker_ids.flatten().tolist())
result["corner_count"] = 0 if charuco_corners is None else len(charuco_corners)
result["corner_ids"] = [] if charuco_ids is None else sorted(charuco_ids.flatten().tolist())
result["corners"] = [] if charuco_corners is None else charuco_corners.reshape(-1, 2).tolist()
result["expected_markers"] = ${expectedMarkers}
result["expected_corners"] = ${expectedCorners}
print(json.dumps(result))
`;
    } else if (tc.detector === 'charuco' && isTiled) {
      // Tiled page: full CharucoDetector cannot run (pattern cut at tile edge).
      // Verify no ArUco markers detected in the brand region (bottom 25%).
      const dictName = tc.spec.dict;
      pyScript = `
import cv2, numpy as np, json
img = cv2.imread("${renderedPng}")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
h, w = gray.shape
brand_top = int(h * 0.75)
brand_region = gray[brand_top:, :]
dict_id = getattr(cv2.aruco, "${dictName}")
dictionary = cv2.aruco.getPredefinedDictionary(dict_id)
detector = cv2.aruco.ArucoDetector(dictionary, cv2.aruco.DetectorParameters())
corners, ids, _ = detector.detectMarkers(brand_region)
n = 0 if ids is None else len(ids)
result = {"detector": "ArucoDetector (brand-region)", "corner_count": n, "corners": [],
          "expected_corners": 0, "marker_count": n, "expected_markers": 0,
          "marker_ids": [] if ids is None else ids.flatten().tolist(), "corner_ids": []}
print(json.dumps(result))
`;
    } else {
      // Checkerboard
      const innerR = tc.spec.rows - 1;
      const innerC = tc.spec.cols - 1;
      pyScript = `
import cv2, numpy as np, json
img = cv2.imread("${renderedPng}")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
ret, corners = cv2.findChessboardCornersSB(gray, (${innerC}, ${innerR}))
result = {"detector": "findChessboardCornersSB"}
result["corner_count"] = 0 if not ret else len(corners)
result["corners"] = [] if not ret else corners.reshape(-1, 2).tolist()
result["expected_corners"] = ${innerR * innerC}
result["marker_count"] = 0
result["expected_markers"] = 0
result["marker_ids"] = []
result["corner_ids"] = []
print(json.dumps(result))
`;
    }

    let detection;
    try {
      const out = runPython(pyScript);
      detection = JSON.parse(out.trim());
    } catch (e) {
      errors.push(`${tc.name}: Python failed: ${e.message}`);
      continue;
    }

    // Assertions
    const tolerance = 5 * mmToPx;
    let cornersOutside = 0, cornersInBrand = 0, cornersInAxes = 0;

    for (const [cx, cy] of detection.corners) {
      if (cx < patOx - tolerance || cx > patOx + patBw + tolerance ||
          cy < patOy - tolerance || cy > patOy + patBh + tolerance) {
        cornersOutside++;
      }
      if (cy >= brandY) cornersInBrand++;
      if (cx >= axesX && cx <= axesX + axesW &&
          cy >= axesY && cy <= axesY + axesH) cornersInAxes++;
    }

    // Check counts
    if (detection.corner_count !== detection.expected_corners) {
      errors.push(`${tc.name}: ${detection.corner_count} corners, expected ${detection.expected_corners}`);
    }
    if (detection.marker_count !== undefined && detection.expected_markers > 0 &&
        detection.marker_count !== detection.expected_markers) {
      errors.push(`${tc.name}: ${detection.marker_count} markers, expected ${detection.expected_markers}`);
    }
    if (!isTiled && cornersOutside > 0) {
      errors.push(`${tc.name}: ${cornersOutside} corners outside pattern bbox`);
    }
    if (cornersInBrand > 0) {
      errors.push(`${tc.name}: ${cornersInBrand} false detections in brand block`);
    }
    if (!isTiled && cornersInAxes > 0) {
      errors.push(`${tc.name}: ${cornersInAxes} false detections in axes region`);
    }

    const pass = errors.filter(e => e.startsWith(tc.name)).length === 0;

    const result = {
      name: tc.name,
      description: tc.description,
      detector: detection.detector,
      markers: detection.marker_count,
      expectedMarkers: detection.expected_markers,
      markerIds: detection.marker_ids,
      corners: detection.corner_count,
      expectedCorners: detection.expected_corners,
      cornersOutside, cornersInBrand, cornersInAxes,
      pass,
    };
    results.push(result);

    console.log(`  Detector: ${detection.detector}`);
    if (detection.expected_markers > 0)
      console.log(`  Markers: ${detection.marker_count}/${detection.expected_markers}`);
    console.log(`  Corners: ${detection.corner_count}/${detection.expected_corners}`);
    console.log(`  Outside: ${cornersOutside}, brand: ${cornersInBrand}, axes: ${cornersInAxes}`);
    console.log(`  ${pass ? 'PASS' : 'FAIL'}`);
  }

  writeFileSync(resolve(OUT_DIR, 'detection-results.json'), JSON.stringify(results, null, 2));

  if (errors.length > 0) {
    console.error('\n[check-detection] DETECTION GUARD FAILED:');
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  console.log('\n[check-detection] OK — all detection checks passed.');
  for (const r of results) {
    const parts = [`${r.corners}/${r.expectedCorners} corners`];
    if (r.expectedMarkers > 0) parts.unshift(`${r.markers}/${r.expectedMarkers} markers`);
    parts.push('0 false detections');
    console.log(`  ${r.name}: ${parts.join(', ')}`);
  }
}

run().catch((err) => {
  console.error('[check-detection] Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
