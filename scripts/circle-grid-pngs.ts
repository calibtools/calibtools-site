/**
 * Renders every stock circle grid on its board to PNG, for docs/content/experiments/circle-grid-detect.py.
 *   npx tsx scripts/circle-grid-pngs.ts && python3 docs/content/experiments/circle-grid-detect.py
 * Layouts come from the catalog, so the check follows the product data.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { CATALOG } from '../src/lib/catalogPatterns';
import { Resvg } from '@resvg/resvg-js';
import { renderCirclesSvg } from '../src/lib/renderCircles';
import { patternFrame } from '../src/lib/boardDrawing';
import { GENERATOR_DEFAULT } from '../src/lib/patternLink';
mkdirSync('out/circle-grids', { recursive: true });
const out: { name: string; kind: string; rows: number; cols: number; marginX: number; marginY: number }[] = [];
for (const e of CATALOG.filter((c) => c.handle === 'circlegrid-composite')) {
  const [w, h] = e.partNumber.split('-')[3].split('X').map(Number);
  const spec = { ...GENERATOR_DEFAULT, ...e.spec } as Parameters<typeof patternFrame>[0];
  const f = patternFrame(spec);
  const rx = (w - f.box.w) / 2 - f.box.x, ry = (h - f.box.h) / 2 - f.box.y;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fff"/>${renderCirclesSvg(spec, rx, ry)}</svg>`;
  writeFileSync(`out/circle-grids/${e.partNumber}.png`, new Resvg(svg, { fitTo: { mode: 'width', value: 1600 } }).render().asPng());
  out.push({ name: e.partNumber, kind: spec.type === 'Symmetric circles' ? 'SYM' : 'ASY', rows: spec.rows, cols: spec.cols, marginX: (w - f.box.w) / 2, marginY: (h - f.box.h) / 2 });
}
writeFileSync('out/circle-grids/list.json', JSON.stringify(out));
console.log(out.map((o) => `${o.name} lattice ${o.rows}x${o.cols} margins ${o.marginX}/${o.marginY}`).join('\n'));
