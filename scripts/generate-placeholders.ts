/**
 * Generate placeholder assets at build time:
 * 1. public/og/default.svg — OG image with logo wordmark + pattern fragment
 * (Sample inspection report withdrawn — no longer generated.)
 * 3. Per-product OG images (SVG → PNG)
 *
 * Run as part of prebuild via tsx.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import {
  BRAND_RED,
  BRAND_INK,
  BRAND_URL,
  BRAND_NAME,
  BRAND_EMAIL,
  BRAND_RED_RGB,
  BRAND_INK_RGB,
} from '../src/lib/brand';
import {
  wordmarkSvgGroup,
  WORDMARK_PATHS,
  WORDMARK_FRAME_RECTS as WM_FRAME_RECTS,
  WORDMARK_DOT_RECT as WM_DOT,
  WORDMARK_VB,
} from '../src/lib/exportBrand';

const ROOT = resolve('public');

// --- 1. OG image (SVG, 1200×630) ---

mkdirSync(resolve(ROOT, 'og'), { recursive: true });

// Bracket-framed wordmark for OG image (screen context — 40px tall)
const ogWordmark = wordmarkSvgGroup({ x: 350, y: 240, heightMm: 40 });

// Pattern fragment — a small checkerboard in the bottom-right
const patternRects: string[] = [];
for (let r = 0; r < 6; r++) {
  for (let c = 0; c < 10; c++) {
    if ((r + c) % 2 === 0) {
      patternRects.push(`<rect x="${820 + c * 32}" y="${380 + r * 32}" width="32" height="32" fill="#E6E6E6"/>`);
    }
  }
}

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FFFFFF"/>
  <!-- Pattern fragment -->
  <g opacity="0.5">
    ${patternRects.join('\n    ')}
  </g>
  <!-- Wordmark -->
  ${ogWordmark}
  <!-- Tagline -->
  <text x="600" y="360" font-family="'Geist', system-ui, sans-serif" font-size="20" fill="#6B6B6B" text-anchor="middle">Know your target to the micron</text>
  <!-- URL -->
  <text x="600" y="580" font-family="monospace" font-size="16" fill="#9A9A9A" text-anchor="middle">${BRAND_URL}</text>
</svg>`;

writeFileSync(resolve(ROOT, 'og/default.svg'), ogSvg);
console.log('[placeholders] Generated public/og/default.svg (1200×630)');

// Render SVG → PNG for social crawlers
const resvg = new Resvg(ogSvg, { fitTo: { mode: 'width', value: 1200 } });
const pngData = resvg.render();
writeFileSync(resolve(ROOT, 'og/default.png'), pngData.asPng());
console.log('[placeholders] Generated public/og/default.png (1200×630)');

// --- 2. Sample inspection report (WITHDRAWN — no longer generated) ---

// --- 3. Per-product OG images ---

const productHandles = [
  { handle: 'checkerboard-composite', title: 'Checkerboard Calibration Target, Aluminum Composite' },
  { handle: 'charuco-composite', title: 'ChArUco Calibration Target, Aluminum Composite' },
  { handle: 'charuco-ceramic', title: 'ChArUco Calibration Target, Alumina Ceramic' },
  { handle: 'mounting-fixture', title: 'Target Mounting Fixture, ¼″-20' },
  { handle: 'certificate-ilac', title: 'Calibration certificate' },
  { handle: 'aprilgrid-composite', title: 'AprilGrid Calibration Target, Aluminum Composite' },
  { handle: 'circlegrid-composite', title: 'Circle Grid Calibration Target, Aluminum Composite' },
  { handle: 'halcon-composite', title: 'HALCON Calibration Plate, Aluminum Composite' },
  { handle: 'reflectance-panel', title: 'LiDAR Reflectance Panel, Lambertian' },
  { handle: 'resolution-chart', title: 'ISO 12233 Resolution Test Chart' },
  { handle: 'color-chart', title: '24-Patch Color Chart' },
  { handle: 'grayscale-oecf-chart', title: 'Gray Scale and OECF Chart' },
  { handle: 'focus-siemens-star-chart', title: 'Siemens Star and Focus Chart' },
  { handle: 'resolution-targets-glass', title: 'USAF 1951, Ronchi and Glass Scale Targets' },
  { handle: 'grid-distortion-target', title: 'Grid Distortion Target, Chrome on Glass' },
  { handle: 'backlit-target', title: 'Backlit Calibration Target' },
  { handle: "lidar-camera-target", title: "LiDAR-Camera Calibration Target" },
  { handle: "thermal-calibration-target", title: "Heated Thermal Calibration Target" },
  { handle: "nir-calibration-target", title: "NIR Calibration Target, 850 / 940 nm" },
  { handle: "depth-camera-target", title: "Depth & ToF Camera Calibration Targets" },
  { handle: "hand-eye-calibration-kit", title: "Hand-Eye Calibration Kit" },
  { handle: "multi-camera-target", title: "Multi-Camera Calibration Target" },
  { handle: "line-scan-target", title: "Line-Scan Camera Calibration Target" },
  { handle: "radar-camera-target", title: "Radar-Camera Calibration Target" },
];

for (const { handle, title } of productHandles) {
  const outPath = resolve(ROOT, `og/${handle}.png`);
  const productOgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FFFFFF"/>
  <g opacity="0.5">
    ${patternRects.join('\n    ')}
  </g>
  ${ogWordmark}
  <text x="600" y="340" font-family="'Geist', system-ui, sans-serif" font-size="28" font-weight="700" fill="${BRAND_INK}" text-anchor="middle">${title.replace(/&/g, '&amp;')}</text>
  <text x="600" y="380" font-family="'Geist', system-ui, sans-serif" font-size="18" fill="#6B6B6B" text-anchor="middle">Precision calibration target</text>
  <text x="600" y="580" font-family="monospace" font-size="16" fill="#9A9A9A" text-anchor="middle">${BRAND_URL}</text>
</svg>`;
  const productResvg = new Resvg(productOgSvg, { fitTo: { mode: 'width', value: 1200 } });
  writeFileSync(outPath, productResvg.render().asPng());
  console.log(`[placeholders] Generated public/og/${handle}.png`);
}
