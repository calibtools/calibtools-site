#!/usr/bin/env tsx
/**
 * Files for one HALCON plate: the description file (.descr) and a 1:1 drawing (.svg).
 *
 *   pnpm halcon:plate --board 300x200 --x 9 --y 6 [--dist 24] [--ratio 0.5] [--out out/halcon]
 *   pnpm halcon:plate --board 300x200 --descr customer.descr [--out out/halcon]
 *
 * With --descr the plate is drawn exactly as the customer's file describes it.
 * Without --dist the largest mark distance that leaves a 15 mm margin is used.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { caltabDescr, caltabGeometry, caltabSize, caltabSvg, largestMarkDist, parseDescr } from '../src/lib/halconCaltab';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1] ?? '');

const board = /^(\d+)x(\d+)$/i.exec(args.get('board') ?? '');
if (!board) {
  console.error('Usage: pnpm halcon:plate --board 300x200 (--x 9 --y 6 [--dist 24] [--ratio 0.5] | --descr file.descr) [--out dir]');
  process.exit(1);
}
const boardW = Number(board[1]);
const boardH = Number(board[2]);
const MARGIN = 15;

let geometry;
if (args.has('descr')) {
  geometry = parseDescr(readFileSync(resolve(args.get('descr')!), 'utf-8'));
} else {
  const xNum = Number(args.get('x'));
  const yNum = Number(args.get('y'));
  const markDist = args.has('dist') ? Number(args.get('dist')) : largestMarkDist(xNum, yNum, boardW, boardH, MARGIN);
  geometry = caltabGeometry({ xNum, yNum, markDist, diameterRatio: Number(args.get('ratio') ?? '0.5') });
}

const size = caltabSize(geometry);
const dist = geometry.marks[1].x - geometry.marks[0].x;
const name = `halcon-${boardW}x${boardH}-${geometry.cols}x${geometry.rows}-${String(dist).replace('.', 'p')}mm`;
const outDir = resolve(args.get('out') ?? 'out/halcon');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, `${name}.svg`), caltabSvg(geometry, boardW, boardH));
writeFileSync(resolve(outDir, `${name}.descr`), caltabDescr(geometry));

console.log(`${geometry.cols} x ${geometry.rows} marks, ${dist} mm apart, mark diameter ${geometry.marks[0].r * 2} mm`);
console.log(`Plate ${size.w} x ${size.h} mm on a ${boardW} x ${boardH} mm board (margins ${Math.round((boardW - size.w) * 50) / 100} / ${Math.round((boardH - size.h) * 50) / 100} mm)`);
console.log(`Written: ${outDir}/${name}.svg, ${name}.descr`);
