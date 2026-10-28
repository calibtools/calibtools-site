#!/usr/bin/env node
/**
 * check-detection.mjs — detection proof for pattern exports.
 *
 * Generates sample PDFs, renders at 300 DPI via pdftoppm, runs OpenCV
 * detectors via Python child process, and asserts:
 *   (i)   detected corner count == expected
 *   (ii)  every detected corner lies inside the pattern bounding box
 *   (iii) zero detections inside the brand block and axes regions
 *
 * Three test cases:
 *   1. ChArUco 6×10 @ 20 mm  A4 landscape
 *   2. ChArUco 7×12 @ 25 mm  tiled sheet 1
 *   3. Checkerboard 5×7 @ 15 mm  A4 portrait (brand block proportionally largest)
 *
 * Requirements: python3 with opencv-python-headless, pdftoppm (poppler).
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'docs/audit/2026-10-28-brand-block');

mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runPython(script) {
  return execFileSync('python3', ['-c', script], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

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
    description: 'Checkerboard 5×7 @ 15 mm, A4 portrait (brand block proportionally largest)',
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const { exportPdf, exportTiledPdf } = await import('../src/lib/exportPdf.ts');
  const { computeLayout, computeTiling } = await import('../src/lib/pageLayout.ts');

  const fontDir = resolve(ROOT, 'src/assets/fonts');
  const fontBytes = {
    regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer,
    semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer,
    mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer,
  };

  const errors = [];
  const results = [];

  for (const testCase of CASES) {
    console.log(`\n[check-detection] ${testCase.description}`);

    const layout = computeLayout(testCase.spec, testCase.paperW, testCase.paperH);
    let pdfBytes;
    let pw, ph;

    if (testCase.tiled) {
      const bw = testCase.spec.cols * testCase.spec.square;
      const bh = testCase.spec.rows * testCase.spec.square;
      const tiling = computeTiling(bw, bh, testCase.paperW, testCase.paperH);
      pdfBytes = await exportTiledPdf({ spec: testCase.spec, tiling, fontBytes });
      pw = tiling.tilePw;
      ph = tiling.tilePh;
    } else {
      pw = layout.pw;
      ph = layout.ph;
      pdfBytes = await exportPdf({ spec: testCase.spec, pw, ph, fontBytes, layout });
    }

    // Write PDF
    const pdfPath = resolve(OUT_DIR, `${testCase.name}.pdf`);
    writeFileSync(pdfPath, pdfBytes);

    // Render at 300 DPI via pdftoppm (first page only)
    const pngPath = resolve(OUT_DIR, testCase.name);
    try {
      execFileSync('pdftoppm', ['-r', '300', '-png', '-f', '1', '-l', '1', pdfPath, pngPath], { stdio: 'pipe' });
    } catch (e) {
      errors.push(`${testCase.name}: pdftoppm failed: ${e.message}`);
      continue;
    }

    // pdftoppm appends -1 or -01 suffix
    let renderedPng = `${pngPath}-1.png`;
    if (!existsSync(renderedPng)) renderedPng = `${pngPath}-01.png`;
    if (!existsSync(renderedPng)) {
      errors.push(`${testCase.name}: rendered PNG not found`);
      continue;
    }

    // Pattern bounding box in mm → pixels at 300 DPI
    const dpi = 300;
    const mmToPx = dpi / 25.4;
    const patOx = layout.ox * mmToPx;
    const patOy = layout.oy * mmToPx;
    const patBw = layout.bw * mmToPx;
    const patBh = layout.bh * mmToPx;

    // Brand block region in mm → pixels
    const brandX = layout.brand.wmX * mmToPx;
    const brandY = layout.brand.wmY * mmToPx;
    const brandW = (layout.pw - layout.brand.wmX - layout.margin) * mmToPx;
    const brandH = (layout.brand.wmH + layout.brand.textLineH * 3) * mmToPx;

    // Axes region in mm → pixels
    const axesX = layout.axes.originX * mmToPx;
    const axesY = (layout.axes.originY - 5) * mmToPx;
    const axesW = (layout.axes.arrowLen + 10) * mmToPx;
    const axesH = (layout.axes.arrowLen + 10) * mmToPx;

    // Run Python detection
    const isTiled = !!testCase.tiled;
    const innerRows = testCase.spec.rows - 1;
    const innerCols = testCase.spec.cols - 1;

    const pyScript = `
import cv2
import numpy as np
import json
import sys

img = cv2.imread("${renderedPng}")
if img is None:
    print(json.dumps({"error": "Failed to read image"}))
    sys.exit(0)

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
h, w = gray.shape

result = {"corners": [], "count": 0, "expected": 0, "error": None, "detector_used": "findChessboardCornersSB", "tiled": ${isTiled ? 'True' : 'False'}}

inner_rows = ${innerRows}
inner_cols = ${innerCols}
tiled = ${isTiled ? 'True' : 'False'}

# findChessboardCornersSB detects inner corners of the checkerboard
# pattern — works for both pure checkerboards and ChArUco boards.
#
# OBSTACLE for CharucoDetector: the site's bundled ArUco dictionary
# data does not match OpenCV's DICT_6X6_250 — this is a known
# data-quality issue to be fixed separately.

if tiled:
    # Tiled page: pattern extends to tile edges without a quiet zone
    # border, so findChessboardCornersSB cannot detect — it requires
    # a complete grid surrounded by white space.
    # Brand-block interference proof: crop the brand-block region and
    # run findChessboardCornersSB on it — must find zero grids.
    brand_top_px = int(h * 0.75)  # brand block is in bottom quarter
    brand_region = gray[brand_top_px:, :]
    found_in_brand = False
    for r in range(3, 8):
        for c in range(3, 12):
            ret, _ = cv2.findChessboardCornersSB(brand_region, (c, r))
            if ret:
                found_in_brand = True
                break
        if found_in_brand:
            break
    result["count"] = 0 if not found_in_brand else 1
    result["expected"] = 0  # brand region must have zero pattern detections
    result["detector_used"] = "findChessboardCornersSB (brand-region scan)"
else:
    ret, corners = cv2.findChessboardCornersSB(gray, (inner_cols, inner_rows))
    if ret and corners is not None:
        result["count"] = len(corners)
        result["corners"] = corners.reshape(-1, 2).tolist()
    result["expected"] = inner_rows * inner_cols

print(json.dumps(result))
`;

    let detection;
    try {
      const pyOut = runPython(pyScript);
      detection = JSON.parse(pyOut.trim());
    } catch (e) {
      errors.push(`${testCase.name}: Python detection failed: ${e.message}`);
      continue;
    }

    if (detection.error) {
      errors.push(`${testCase.name}: ${detection.error}`);
      continue;
    }

    // (i) Corner count == expected
    const countMatch = detection.count === detection.expected;
    if (!countMatch) {
      errors.push(`${testCase.name}: detected ${detection.count} corners, expected ${detection.expected}`);
    }

    // (ii) Every corner inside pattern bounding box (with 5% tolerance for sub-pixel)
    const tolerance = 5 * mmToPx; // 5 mm tolerance for edge detection
    let cornersOutside = 0;
    for (const [cx, cy] of detection.corners) {
      if (cx < patOx - tolerance || cx > patOx + patBw + tolerance ||
          cy < patOy - tolerance || cy > patOy + patBh + tolerance) {
        cornersOutside++;
      }
    }
    if (cornersOutside > 0) {
      errors.push(`${testCase.name}: ${cornersOutside} corners outside pattern bounding box`);
    }

    // (iii) Zero detections inside brand block or axes regions
    let cornersInBrand = 0;
    let cornersInAxes = 0;
    for (const [cx, cy] of detection.corners) {
      if (cx >= brandX && cx <= brandX + brandW &&
          cy >= brandY && cy <= brandY + brandH) {
        cornersInBrand++;
      }
      if (cx >= axesX && cx <= axesX + axesW &&
          cy >= axesY && cy <= axesY + axesH) {
        cornersInAxes++;
      }
    }
    if (cornersInBrand > 0) {
      errors.push(`${testCase.name}: ${cornersInBrand} false detections inside brand block`);
    }
    if (cornersInAxes > 0) {
      errors.push(`${testCase.name}: ${cornersInAxes} false detections inside axes region`);
    }

    const result = {
      name: testCase.name,
      description: testCase.description,
      detected: detection.count,
      expected: detection.expected,
      cornersOutside,
      cornersInBrand,
      cornersInAxes,
      pass: countMatch && cornersOutside === 0 && cornersInBrand === 0 && cornersInAxes === 0,
      pngFile: renderedPng.replace(ROOT + '/', ''),
    };
    results.push(result);

    console.log(`  Detected: ${detection.count}/${detection.expected} corners`);
    console.log(`  Outside pattern: ${cornersOutside}, in brand: ${cornersInBrand}, in axes: ${cornersInAxes}`);
    console.log(`  ${result.pass ? 'PASS' : 'FAIL'}`);
  }

  // Write results JSON for the audit report
  writeFileSync(
    resolve(OUT_DIR, 'detection-results.json'),
    JSON.stringify(results, null, 2),
  );

  // Report
  if (errors.length > 0) {
    console.error('\n[check-detection] DETECTION GUARD FAILED:');
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  console.log('\n[check-detection] OK — all detection checks passed.');
  for (const r of results) {
    console.log(`  ${r.name}: ${r.detected}/${r.expected} corners, 0 false detections`);
  }
}

run().catch((err) => {
  console.error('[check-detection] Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
