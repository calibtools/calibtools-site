/**
 * Generate placeholder assets at build time:
 * 1. public/og/default.svg — OG image with logo wordmark + pattern fragment
 * (Sample inspection report withdrawn — no longer generated.)
 * 3. Per-product OG images (SVG → PNG)
 *
 * Run as part of prebuild via tsx.
 */

import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
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
import { ogSvg } from '../src/lib/ogImage';
import { drawingForPartNumber, representativePartNumber } from '../src/lib/boardDrawing';
import { caltabGeometry, caltabSvg } from '../src/lib/halconCaltab';

const ROOT = resolve('public');

// --- 1. OG image (SVG, 1200×630) ---

mkdirSync(resolve(ROOT, 'og'), { recursive: true });

const defaultOgSvg = ogSvg({
  label: 'Calibration targets and tools',
  title: 'Calibration targets whose files, geometry and data agree.',
  drawing: drawingForPartNumber('CT-CHA-P-400X300-D5'),
});

writeFileSync(resolve(ROOT, 'og/default.svg'), defaultOgSvg);
console.log('[placeholders] Generated public/og/default.svg (1200×630)');

// Render SVG → PNG for social crawlers (fonts and renderOg are defined below, so render after them)

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

const ogFonts = {
  fontFiles: ['Geist-Regular.ttf', 'Geist-SemiBold.ttf', 'GeistMono-Regular.ttf'].map((f) => resolve('src/assets/fonts', f)),
  loadSystemFonts: false,
  defaultFontFamily: 'Geist',
};
const renderOg = (svg: string, out: string) => writeFileSync(out, new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: ogFonts }).render().asPng());
renderOg(defaultOgSvg, resolve(ROOT, 'og/default.png'));
console.log('[placeholders] Generated public/og/default.png (1200×630)');

/** Line drawing for the share image, from the same geometry as the product page. */
function productDrawing(handle: string): { drawing?: string; note?: string } {
  const pn = representativePartNumber(handle);
  const svg = pn ? drawingForPartNumber(pn) : undefined;
  if (pn && svg) return { drawing: svg, note: pn.replace('{DICT}', 'D6') };
  if (handle === 'halcon-composite') return { drawing: caltabSvg(caltabGeometry({ xNum: 9, yNum: 7, markDist: 30, diameterRatio: 0.5 }), 400, 300), note: 'gen_caltab layout' };
  return {};
}

for (const { handle, title } of productHandles) {
  const contentFile = resolve('src/content/products', `${handle}.md`);
  const summary = existsSync(contentFile) ? /^summary:\s*"([^"]+)"/m.exec(readFileSync(contentFile, 'utf-8'))?.[1] : undefined;
  renderOg(ogSvg({ label: handle === 'certificate-ilac' ? 'Service' : handle === 'mounting-fixture' ? 'Accessory' : 'Calibration target', title, sub: summary, ...productDrawing(handle) }), resolve(ROOT, `og/${handle}.png`));
  console.log(`[placeholders] Generated public/og/${handle}.png`);
}

// --- 4. Per-guide OG images (title from frontmatter; Article JSON-LD links /og/<slug>.png) ---


const guidesDir = resolve('src/content/guides');
for (const file of readdirSync(guidesDir).filter((f) => f.endsWith('.md')).sort()) {
  const slug = file.replace(/\.md$/, '');
  const src = readFileSync(resolve(guidesDir, file), 'utf-8');
  const m = src.match(/^title:\s*"([^"]+)"/m);
  if (!m) continue;
  renderOg(ogSvg({ label: 'Guide', title: m[1], sub: /^description:\s*"([^"]+)"/m.exec(src)?.[1] }), resolve(ROOT, `og/${slug}.png`));
  console.log(`[placeholders] Generated public/og/${slug}.png (guide)`);
}
