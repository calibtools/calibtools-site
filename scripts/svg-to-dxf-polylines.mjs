#!/usr/bin/env node
/**
 * svg-to-dxf-polylines.mjs
 *
 * One-time conversion: parse the bracket-framed wordmark SVG (outlined paths + rects)
 * and output a TypeScript data file with polyline vertices for DXF embedding.
 *
 * Cubic Bézier curves are linearised with adaptive subdivision (chord tolerance 0.5 units
 * in the SVG coordinate space — well under 0.01 mm at export scale).
 *
 * Usage: node scripts/svg-to-dxf-polylines.mjs
 * Output: src/lib/wordmarkDxf.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SVG_PATH = resolve(ROOT, 'public/brand/wordmark-framed-light.svg');
const OUT_PATH = resolve(ROOT, 'src/lib/wordmarkDxf.ts');

// ---------------------------------------------------------------------------
// SVG path parser
// ---------------------------------------------------------------------------

function tokenise(d) {
  const tokens = [];
  const re = /([MmZzLlHhVvCcSsQqTtAa])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    if (m[1]) tokens.push(m[1]);
    else tokens.push(parseFloat(m[2]));
  }
  return tokens;
}

function parsePath(d) {
  const tokens = tokenise(d);
  const subpaths = [];
  let current = [];
  let cx = 0, cy = 0; // current point
  let sx = 0, sy = 0; // subpath start
  let i = 0;

  function num() { return tokens[i++]; }

  while (i < tokens.length) {
    const cmd = typeof tokens[i] === 'string' ? tokens[i++] : 'L'; // implicit lineTo after M

    switch (cmd) {
      case 'M':
        if (current.length > 0) subpaths.push(current);
        cx = num(); cy = num();
        sx = cx; sy = cy;
        current = [[cx, cy]];
        // Subsequent coordinate pairs after M are implicit L
        while (i < tokens.length && typeof tokens[i] === 'number') {
          cx = num(); cy = num();
          current.push([cx, cy]);
        }
        break;
      case 'L':
        while (i < tokens.length && typeof tokens[i] === 'number') {
          cx = num(); cy = num();
          current.push([cx, cy]);
        }
        break;
      case 'H':
        while (i < tokens.length && typeof tokens[i] === 'number') {
          cx = num();
          current.push([cx, cy]);
        }
        break;
      case 'V':
        while (i < tokens.length && typeof tokens[i] === 'number') {
          cy = num();
          current.push([cx, cy]);
        }
        break;
      case 'C':
        while (i < tokens.length && typeof tokens[i] === 'number') {
          const x1 = num(), y1 = num();
          const x2 = num(), y2 = num();
          const x = num(), y = num();
          lineariseCubic(current, cx, cy, x1, y1, x2, y2, x, y);
          cx = x; cy = y;
        }
        break;
      case 'Z':
      case 'z':
        if (current.length > 0) {
          // Close the path
          current.push([sx, sy]);
          subpaths.push(current);
          current = [];
        }
        cx = sx; cy = sy;
        break;
      default:
        throw new Error(`Unsupported SVG path command: ${cmd}`);
    }
  }
  if (current.length > 0) subpaths.push(current);
  return subpaths;
}

// ---------------------------------------------------------------------------
// Cubic Bézier linearisation (adaptive subdivision)
// ---------------------------------------------------------------------------

function lineariseCubic(pts, x0, y0, x1, y1, x2, y2, x3, y3, tolerance = 0.5) {
  // Flatness test: max distance of control points from the line p0→p3
  const dx = x3 - x0, dy = y3 - y0;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 0.01) {
    // Degenerate — just add endpoint
    pts.push([x3, y3]);
    return;
  }

  // Distance of cp1 and cp2 from line p0→p3
  const d1 = Math.abs((x1 - x0) * dy - (y1 - y0) * dx) / Math.sqrt(lenSq);
  const d2 = Math.abs((x2 - x0) * dy - (y2 - y0) * dx) / Math.sqrt(lenSq);

  if (Math.max(d1, d2) <= tolerance) {
    pts.push([x3, y3]);
    return;
  }

  // de Casteljau subdivision at t=0.5
  const mx01 = (x0 + x1) / 2, my01 = (y0 + y1) / 2;
  const mx12 = (x1 + x2) / 2, my12 = (y1 + y2) / 2;
  const mx23 = (x2 + x3) / 2, my23 = (y2 + y3) / 2;
  const mx012 = (mx01 + mx12) / 2, my012 = (my01 + my12) / 2;
  const mx123 = (mx12 + mx23) / 2, my123 = (my12 + my23) / 2;
  const mx0123 = (mx012 + mx123) / 2, my0123 = (my012 + my123) / 2;

  lineariseCubic(pts, x0, y0, mx01, my01, mx012, my012, mx0123, my0123, tolerance);
  lineariseCubic(pts, mx0123, my0123, mx123, my123, mx23, my23, x3, y3, tolerance);
}

// ---------------------------------------------------------------------------
// SVG parsing
// ---------------------------------------------------------------------------

const svg = readFileSync(SVG_PATH, 'utf-8');

// Extract all <path> d attributes
const pathRe = /<path\s+d="([^"]+)"/g;
const paths = [];
let pm;
while ((pm = pathRe.exec(svg)) !== null) {
  paths.push(pm[1]);
}

// Extract all <rect> attributes
const rectRe = /<rect\s+([^>]+)\/>/g;
const rects = [];
let rm;
while ((rm = rectRe.exec(svg)) !== null) {
  const attrs = rm[1];
  const x = parseFloat(attrs.match(/x="([^"]+)"/)?.[1] ?? '0');
  const y = parseFloat(attrs.match(/y="([^"]+)"/)?.[1] ?? '0');
  const w = parseFloat(attrs.match(/width="([^"]+)"/)?.[1] ?? '0');
  const h = parseFloat(attrs.match(/height="([^"]+)"/)?.[1] ?? '0');
  const fill = attrs.match(/fill="([^"]+)"/)?.[1] ?? '#000000';
  rects.push({ x, y, w, h, fill });
}

// Convert paths to polylines
const polylines = [];
for (const d of paths) {
  const subpaths = parsePath(d);
  for (const sp of subpaths) {
    // Round coordinates to 1 decimal place (sufficient precision)
    polylines.push(sp.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
  }
}

console.log(`Parsed ${paths.length} paths → ${polylines.length} polylines`);
console.log(`Parsed ${rects.length} rects (${rects.filter(r => r.fill === '#E60012').length} red dot, ${rects.filter(r => r.fill !== '#E60012').length} frame)`);

let totalVerts = 0;
for (const pl of polylines) totalVerts += pl.length;
console.log(`Total vertices: ${totalVerts}`);

// ---------------------------------------------------------------------------
// Generate TypeScript output
// ---------------------------------------------------------------------------

const lines = [
  '/**',
  ' * DXF polyline data for the bracket-framed wordmark.',
  ' * Auto-generated by scripts/svg-to-dxf-polylines.mjs — do not edit by hand.',
  ' *',
  ' * Source: public/brand/wordmark-framed-light.svg',
  ' * Coordinate space: SVG viewBox -285.2 -1283.7 7796.4 1857.4',
  ' */',
  '',
  '/** viewBox dimensions for scaling. */',
  'export const WORDMARK_VIEWBOX = { minX: -285.2, minY: -1283.7, width: 7796.4, height: 1857.4 } as const;',
  '',
  '/** Letter outlines as closed polylines (SVG coordinates). */',
  `export const WORDMARK_POLYLINES: readonly (readonly [number, number])[][] = ${JSON.stringify(polylines)};`,
  '',
  '/** Bracket frame rects: [x, y, w, h] in SVG coordinates (all black). */',
  `export const WORDMARK_FRAME_RECTS: readonly (readonly [number, number, number, number])[] = ${JSON.stringify(rects.filter(r => r.fill !== '#E60012').map(r => [r.x, r.y, r.w, r.h]))};`,
  '',
  '/** Red dot rect: [x, y, w, h] in SVG coordinates. */',
  `export const WORDMARK_DOT_RECT: readonly [number, number, number, number] = ${JSON.stringify([rects.find(r => r.fill === '#E60012')].map(r => [r.x, r.y, r.w, r.h])[0])};`,
  '',
];

writeFileSync(OUT_PATH, lines.join('\n') + '\n');
console.log(`Wrote ${OUT_PATH}`);
