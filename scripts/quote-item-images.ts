/**
 * Images for the unlisted Shopify products used as line items on custom quotations (boards by pattern type,
 * stands, rush, design). Boards come from boardDrawingSvg, so they follow the same geometry as the datasheets.
 * Run: npx tsx scripts/quote-item-images.ts, then convert the SVGs to PNG (sharp) and upload them as product media.
 */
import { boardDrawingSvg } from '../src/lib/boardDrawing';
import { GENERATOR_DEFAULT } from '../src/lib/patternLink';
import { writeFileSync } from 'node:fs';
const PAPER = '#F4F3EF', INK = '#141414', RED = '#E60012', LINE = '#A8A59C';
const S = 1200;
const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="${PAPER}"/>${inner}</svg>`;
// Board drawing placed in the middle at 76% width.
function board(name: string, spec: any, bw = 400, bh = 300) {
  const svg = boardDrawingSvg({ boardW: bw, boardH: bh, spec: { ...GENERATOR_DEFAULT, ...spec }, label: '', dimensions: false });
  const vb = /viewBox="([^"]+)"/.exec(svg)![1].split(/\s+/).map(Number);
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const k = (S * 0.78) / vb[2];
  const tx = (S - vb[2] * k) / 2 - vb[0] * k, ty = (S - vb[3] * k) / 2 - vb[1] * k;
  writeFileSync(`public/img/quote-items/${name}.svg`, wrap(`<g transform="translate(${tx} ${ty}) scale(${k})">${inner}</g>`));
}
board('custom-charuco', { type: 'ChArUco', rows: 7, cols: 10, square: 36, marker: 27, dict: 'DICT_5X5_1000' });
board('custom-checkerboard', { type: 'Checkerboard', rows: 7, cols: 10, square: 36 });
board('custom-aprilgrid', { type: 'AprilGrid (Kalibr)', rows: 5, cols: 7, square: 40 });
board('custom-circles', { type: 'Asymmetric circles', rows: 7, cols: 9, square: 36 });
const g = (s: string) => `<g fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="miter" stroke-linecap="square">${s}</g>`;
// Stand: tilted board on a base with an upright and a hinge marked in red.
const stand = (low: boolean) => {
  const top = low ? 520 : 300, cx = 600;
  return wrap(g(`
    <line x1="330" y1="960" x2="870" y2="960"/>
    <line x1="${cx}" y1="960" x2="${cx}" y2="${top + 170}"/>
    <line x1="430" y1="960" x2="${cx}" y2="${low ? 860 : 780}"/><line x1="770" y1="960" x2="${cx}" y2="${low ? 860 : 780}"/>
    <g transform="rotate(-14 ${cx} ${top + 170})"><rect x="${cx - 250}" y="${top - 10}" width="500" height="360" fill="${PAPER}"/>
    <rect x="${cx - 210}" y="${top + 30}" width="420" height="280" stroke="${LINE}" stroke-width="4"/></g>`)
    + `<rect x="${cx - 16}" y="${top + 154}" width="32" height="32" fill="${RED}"/>`
    + (low ? '' : `<g stroke="${LINE}" stroke-width="4"><line x1="930" y1="960" x2="930" y2="${top + 170}"/><line x1="910" y1="960" x2="950" y2="960"/><line x1="910" y1="${top + 170}" x2="950" y2="${top + 170}"/></g>`));
};
writeFileSync('public/img/quote-items/stand-low.svg', stand(true));
writeFileSync('public/img/quote-items/stand-high.svg', stand(false));
// Rush: calendar sheet with a short red bar.
writeFileSync('public/img/quote-items/service-rush.svg', wrap(g(`
  <rect x="330" y="340" width="540" height="520"/><line x1="330" y1="460" x2="870" y2="460"/>
  <line x1="450" y1="290" x2="450" y2="390"/><line x1="750" y1="290" x2="750" y2="390"/>
  <g stroke="${LINE}" stroke-width="4"><line x1="420" y1="590" x2="780" y2="590"/><line x1="420" y1="680" x2="780" y2="680"/><line x1="420" y1="770" x2="780" y2="770"/></g>`)
  + `<rect x="420" y="560" width="150" height="60" fill="${RED}"/>`));
// Design: drawing sheet with a title block and dimension line.
writeFileSync('public/img/quote-items/service-design.svg', wrap(g(`
  <rect x="300" y="330" width="600" height="540"/>
  <rect x="380" y="410" width="300" height="220" stroke="${LINE}" stroke-width="4"/>
  <line x1="380" y1="690" x2="680" y2="690" stroke-width="4"/><line x1="380" y1="670" x2="380" y2="710" stroke-width="4"/><line x1="680" y1="670" x2="680" y2="710" stroke-width="4"/>
  <rect x="660" y="770" width="240" height="100"/><line x1="660" y1="820" x2="900" y2="820" stroke-width="4"/>`)
  + `<rect x="380" y="410" width="44" height="44" fill="${INK}"/><rect x="424" y="454" width="44" height="44" fill="${INK}"/><rect x="468" y="410" width="44" height="44" fill="${INK}"/><rect x="750" y="350" width="26" height="26" fill="${RED}"/>`));
