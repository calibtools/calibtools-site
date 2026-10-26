/**
 * Calib.Tools customer-document system.
 *
 * TypeScript port of ctdoc.py — faithful reproduction of every CSS rule,
 * component function, and layout behaviour.
 *
 * Usage
 * -----
 *   import { Doc, section, p, table, kv, status, num } from './ctdoc';
 *   const d = new Doc('CT-IR-000311', 'A', '2026-11-04',
 *     'Inspection report', 'ChArUco target, ceramic, 200 × 150 mm', '000311');
 *   d.addPage(section(1, 'Method') + p('...'));
 *   await d.render('out/CT-IR/CT-IR-000311');
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import QRCode from 'qrcode';
import {
  STAMP_DIAMETER,
  STAMP_ROTATION,
  STAMP_INK,
  STAMP_TOP_TEXT,
  STAMP_BOTTOM_TEXT,
} from './geometry';
import { CONTACT_LINE } from '../lib/reportConfig';

// ----------------------------------------------------------------- brand colours (brand guidelines p. 05)
export const BLACK = '#000000';
export const WHITE = '#FFFFFF';
export const RED = '#E60012';
export const G80 = '#333333';
export const G60 = '#666666';
export const G30 = '#B3B3B3';
export const G10 = '#E6E6E6';
export const G05 = '#F2F2F2';
export const AXIS_GREEN = '#00A651';

// ----------------------------------------------------------------- paper
export const PAPER: Record<string, [number, number]> = {
  A4: [210.0, 297.0],
  Letter: [215.9, 279.4],
};
export const CONTENT_W = 178.0; // mm, identical on both papers (centred)
export const HDR_TOP = 10.0;
export const BODY_TOP = 21.0;
export const BODY_BOTTOM = 16.0;
export const FTR_BOTTOM = 8.0;

export const A4_BODY_H = PAPER.A4[1] - BODY_TOP - BODY_BOTTOM; // 260 mm
export const LETTER_ZOOM =
  (PAPER.Letter[1] - BODY_TOP - BODY_BOTTOM) / A4_BODY_H; // ≈0.9323

// ----------------------------------------------------------------- paths
const CWD = process.cwd();
const WORDMARK_SVG = path.join(CWD, 'public/brand/wordmark-framed-light.svg');

// ----------------------------------------------------------------- HTML escape
export function esc(s: unknown): string {
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ----------------------------------------------------------------- CSS
function fontCss(): string {
  const PUB = path.join(CWD, 'public/fonts');
  const ASSETS = path.join(CWD, 'src/assets/fonts');

  const faces: [string, string, number][] = [
    ['Geist', `file://${ASSETS}/Geist-Regular.ttf`, 400],
    ['Geist', `file://${PUB}/Geist-Medium.woff2`, 500],
    ['Geist', `file://${ASSETS}/Geist-SemiBold.ttf`, 600],
    ['Geist', `file://${PUB}/GeistVariable.woff2`, 700],
    ['Geist', `file://${PUB}/Geist-Black.woff2`, 900],
    ['Geist Mono', `file://${ASSETS}/GeistMono-Regular.ttf`, 400],
    ['Geist Mono', `file://${PUB}/GeistMono-Medium.woff2`, 500],
    ['Geist Mono', `file://${PUB}/GeistMonoVariable.woff2`, 700],
  ];

  let css = faces
    .map(([family, src, weight]) => {
      const fmt = src.endsWith('.woff2') ? 'woff2' : 'truetype';
      return `@font-face{font-family:'${family}';src:url('${src}') format('${fmt}');font-weight:${weight};}`;
    })
    .join('');

  // Geist Pixel
  const pixelSrc = `file://${PUB}/GeistPixel-Square.woff2`;
  css += `@font-face{font-family:'Geist Pixel';src:url('${pixelSrc}') format('woff2');}`;
  return css;
}

export function baseCss(paper: string): string {
  const [W, H] = PAPER[paper];
  const side = (W - CONTENT_W) / 2;
  const z = paper === 'A4' ? 1.0 : LETTER_ZOOM;
  const zin =
    z === 1.0
      ? `.zin { width: 100%; height: 100%; display: flex; flex-direction: column; }`
      : `.zin { zoom: ${z.toFixed(5)}; width: ${(CONTENT_W / z).toFixed(3)}mm; height: ${A4_BODY_H.toFixed(3)}mm; display: flex; flex-direction: column; }`;

  return (
    fontCss() +
    `
:root { --cs: ${(1 / z).toFixed(5)}; }
${zin}
.zin > .push { margin-top: auto; }
@page { size: ${W}mm ${H}mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Geist'; font-size: 10pt; line-height: 1.45; color: ${G80}; -webkit-print-color-adjust: exact; print-color-adjust: exact;
        font-variant-numeric: tabular-nums; }
.page { width: ${W}mm; height: ${H}mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; background: #fff; }
.page:last-child { page-break-after: auto; break-after: auto; }
.hdr { position: absolute; top: ${HDR_TOP}mm; left: ${side}mm; right: ${side}mm; height: 6.6mm; display: flex; justify-content: space-between; align-items: center; }
.hdr img { width: 28mm; height: auto; display: block; }
.hdr .id { font-family: 'Geist Mono'; font-size: 8pt; color: ${BLACK}; letter-spacing: .01em; }
.body { position: absolute; top: ${BODY_TOP}mm; bottom: ${BODY_BOTTOM}mm; left: ${side}mm; right: ${side}mm; overflow: hidden; }
.ftr { position: absolute; bottom: ${FTR_BOTTOM}mm; left: ${side}mm; right: ${side}mm; border-top: 0.25mm solid ${G10}; padding-top: 1.6mm;
        font-size: 8pt; line-height: 1.2; color: ${G60}; display: flex; justify-content: space-between; }
.ftr .pg { font-family: 'Geist Mono'; }
.wm { position: absolute; left: 0; right: 0; top: 50%; text-align: center; transform: translateY(-50%) rotate(-35deg); font-family: 'Geist'; font-weight: 700;
       font-size: 118pt; letter-spacing: .12em; color: rgba(0,0,0,0.055); pointer-events: none; z-index: 20; white-space: nowrap; }

/* type */
.eyebrow { font-family: 'Geist Mono'; font-size: 8pt; letter-spacing: .16em; text-transform: uppercase; color: ${G60}; margin: 3mm 0 1.2mm; }
h1 { font-weight: 700; font-size: 21pt; line-height: 1.15; color: ${BLACK}; margin: 0 0 1.5mm; white-space: nowrap; letter-spacing: -.005em; }
.sub { font-size: 10pt; color: ${G60}; margin: 0 0 4mm; }
h2.sec { font-weight: 600; font-size: 11pt; line-height: 1.25; color: ${BLACK}; margin: 3.6mm 0 1.6mm; padding-top: 1.3mm; border-top: 0.35mm solid ${BLACK};
          display: flex; align-items: baseline; gap: 2.6mm; break-after: avoid; }
h2.sec .n { font-family: 'Geist Mono'; font-weight: 400; font-size: 8.5pt; color: ${G60}; min-width: 4mm; }
h2.sec .aside { margin-left: auto; font-family: 'Geist Mono'; font-weight: 400; font-size: 7.5pt; color: ${G60}; letter-spacing: .04em; }
h3 { font-weight: 600; font-size: 10pt; color: ${BLACK}; margin: 3mm 0 1mm; }
p { margin: 0 0 2mm; }
p.small, .small { font-size: 8.5pt; line-height: 1.4; }
.muted { color: ${G60}; }
.mono { font-family: 'Geist Mono'; }
.black { color: ${BLACK}; }
b, strong { font-weight: 600; color: ${BLACK}; }
ul.l, ol.l { margin: 0 0 2mm; padding-left: 4.5mm; }
ul.l li, ol.l li { margin: 0 0 0.8mm; }
ul.l { list-style: none; padding-left: 4mm; }
ul.l li { position: relative; }
ul.l li::before { content: ''; position: absolute; left: -3.6mm; top: 0.62em; width: 1.3mm; height: 1.3mm; background: ${BLACK}; }
a { color: inherit; text-decoration: none; }

/* key-value blocks */
.kv { display: grid; grid-template-columns: max-content 1fr; column-gap: 4mm; row-gap: 0.45mm; font-size: 9.5pt; line-height: 1.32; margin: 0; }
.kv dt { color: ${G60}; font-size: 8.5pt; padding-top: 0.25mm; white-space: nowrap; }
.kv dd { margin: 0; color: ${BLACK}; }
.kv dd.m { font-family: 'Geist Mono'; font-size: 9pt; }
.cols { display: grid; gap: 7mm; }

/* tables */
table.t { width: 100%; border-collapse: collapse; font-size: 9.5pt; line-height: 1.3; }
table.t th { font-family: 'Geist Mono'; font-size: 7.3pt; font-weight: 500; color: ${G60}; text-transform: uppercase; letter-spacing: .05em; text-align: left;
              padding: 0.8mm 1.8mm 0.9mm; border-bottom: 0.3mm solid ${BLACK}; vertical-align: bottom; line-height: 1.2; }
table.t td { padding: 0.8mm 1.8mm; vertical-align: top; color: ${BLACK}; }
table.t tbody tr:nth-child(even) td { background: ${G10}; }
table.t.plain tbody tr:nth-child(even) td { background: none; }
.nu { text-transform: none; letter-spacing: 0; }
table.t.rawhead th { text-transform: none; letter-spacing: 0; font-size: 7.5pt; }
table.t.plain tbody td { border-bottom: 0.2mm solid ${G10}; }
table.t td.n, table.t th.n { text-align: right; }
table.t td.n, table.t td.m { font-family: 'Geist Mono'; font-size: 9.5pt; white-space: nowrap; }
table.t td.c, table.t th.c { text-align: center; }
table.t tfoot td { border-top: 0.3mm solid ${BLACK}; font-weight: 600; }
table.t.dense { font-size: 8pt; line-height: 1.2; } table.t.dense td { padding: 0.35mm 1.6mm; } table.t.dense td.n, table.t.dense td.m { font-size: 8pt; }
.unit { color: ${G60}; }

/* status words: PASS · FAIL · PENDING · N/A (never red) */
.st { font-family: 'Geist Mono'; font-size: 9pt; letter-spacing: .05em; white-space: nowrap; color: ${BLACK}; }
.st.fail { font-weight: 700; }
.st.pending, .st.na { color: ${G60}; }
.st svg { width: 2.5mm; height: 2.5mm; vertical-align: -0.35mm; margin-right: 1mm; }

/* overall result */
.result { border: 0.5mm solid ${BLACK}; padding: 2.6mm 3.6mm 3mm; }
.result .lab { font-family: 'Geist Mono'; font-size: 7.5pt; letter-spacing: .16em; text-transform: uppercase; color: ${G60}; }
.result .word { font-family: 'Geist Mono'; font-weight: 700; font-size: 24pt; line-height: 1.1; letter-spacing: .06em; color: ${BLACK}; margin: 0.8mm 0 1mm; }
.result .word svg { width: 6mm; height: 6mm; margin-right: 2mm; vertical-align: -0.4mm; }
.result .txt { font-size: 9pt; line-height: 1.35; color: ${BLACK}; }
.result.strip { display: grid; grid-template-columns: 46mm 1fr auto; align-items: center; column-gap: 5mm; padding: 2mm 4mm; }
.result.strip .word { margin: 0.3mm 0 0; font-size: 21pt; }
.result.strip .txt { font-size: 10pt; }
.result .meta { font-family: 'Geist Mono'; font-size: 7.5pt; color: ${G60}; text-align: right; line-height: 1.5; }
.result.fail .meta { color: ${G30}; }
.result.fail { background: ${BLACK}; } .result.fail .lab { color: ${G30}; } .result.fail .word, .result.fail .txt { color: #fff; }
.result.pending { border-style: dashed; border-color: ${G60}; } .result.pending .word { color: ${G60}; }

/* misc blocks */
.note { border-left: 0.8mm solid ${BLACK}; background: ${G05}; padding: 2mm 3mm; font-size: 9pt; line-height: 1.4; margin: 1mm 0 2.5mm; color: ${BLACK}; }
.note .lab { font-family: 'Geist Mono'; font-size: 7.3pt; letter-spacing: .14em; text-transform: uppercase; color: ${G60}; display: block; margin-bottom: .6mm; }
pre.code { font-family: 'Geist Mono'; font-size: 8pt; line-height: 1.45; background: ${G05}; border-left: 0.8mm solid ${G30}; padding: 2mm 3mm; margin: 1mm 0 2.5mm;
            white-space: pre; overflow: hidden; color: ${BLACK}; }
pre.code .c { color: ${G60}; }
figure { margin: 0; }
figcaption, .cap { font-family: 'Geist Mono'; font-size: 7.3pt; color: ${G60}; margin-top: 1.2mm; line-height: 1.4; }
.statement { font-size: 9.5pt; line-height: 1.45; color: ${BLACK}; }
.box { border: 0.25mm solid ${G30}; padding: 2.5mm 3mm; }
.tag { font-family: 'Geist Mono'; font-size: 7.3pt; letter-spacing: .12em; text-transform: uppercase; color: ${G60}; }
.check { display: inline-block; width: 3mm; height: 3mm; border: 0.3mm solid ${BLACK}; vertical-align: -0.5mm; margin-right: 1.2mm; position: relative; }
.check.on::after { content: ''; position: absolute; left: 0.55mm; top: 0.55mm; right: 0.55mm; bottom: 0.55mm; background: ${BLACK}; }
.qr { display: flex; flex-direction: column; align-items: flex-start; }
.qr .u { font-family: 'Geist Mono'; font-size: 7pt; color: ${G60}; margin-top: 1mm; white-space: nowrap; }
.sig { display: flex; align-items: center; }
.sig .who { width: 72mm; }
.sig .line { border-bottom: 0.3mm solid ${BLACK}; height: 9mm; display: flex; align-items: flex-end; padding: 0 0 0.8mm 0; font-family: 'Geist Mono'; font-size: 10pt; color: ${BLACK}; }
.sig .lab { font-size: 8pt; color: ${G60}; margin-top: 1mm; line-height: 1.35; }
.sig .stamp { margin-left: -2.5mm; margin-top: 5mm; }
.qr .u { font-size: calc(7pt * var(--cs,1)); }
.spacer { flex: 0 0 auto; }
/* 1:1 physical size (print sheets, scale bars): cancels the Letter zoom */
.true-scale { zoom: var(--cs); }
`
  );
}

// ----------------------------------------------------------------- small HTML helpers
const _X =
  '<svg viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
  '<path d="M2.6 2.6L7.4 7.4M7.4 2.6L2.6 7.4" stroke="currentColor" stroke-width="1.4"/></svg>';

export function status(word: string): string {
  const w = word.toUpperCase().trim();
  const cls: Record<string, string> = {
    PASS: 'pass',
    FAIL: 'fail',
    PENDING: 'pending',
    'N/A': 'na',
  };
  const c = cls[w] ?? 'pass';
  const sym = w === 'FAIL' ? _X : '';
  return `<span class="st ${c}">${sym}${esc(w)}</span>`;
}

export function result_box(
  word: string,
  text: string,
  label = 'Overall result',
  strip = false,
  meta = '',
): string {
  const w = word.toUpperCase();
  const clsMap: Record<string, string> = {
    PASS: 'pass',
    FAIL: 'fail',
    PENDING: 'pending',
  };
  const cls = clsMap[w] ?? 'pass';
  const sym = w === 'FAIL' ? _X.replace(/currentColor/g, '#fff') : '';
  if (strip) {
    return (
      `<div class="result strip ${cls}"><div><div class="lab">${esc(label)}</div><div class="word">${sym}${esc(w)}</div></div>` +
      `<div class="txt">${text}</div><div class="meta">${meta}</div></div>`
    );
  }
  return (
    `<div class="result ${cls}"><div class="lab">${esc(label)}</div><div class="word">${sym}${esc(w)}</div>` +
    `<div class="txt">${text}</div></div>`
  );
}

export function section(
  n: string | number | null,
  title: string,
  aside = '',
): string {
  const numSpan =
    n != null && n !== ''
      ? `<span class="n">${esc(n)}</span>`
      : '';
  const a = aside ? `<span class="aside">${aside}</span>` : '';
  return `<h2 class="sec">${numSpan}<span>${esc(title)}</span>${a}</h2>`;
}

export function p(text: string, cls = ''): string {
  return `<p class="${cls}">${text}</p>`;
}

export function kv(
  pairs: [string, string][],
  monoKeys: string[] = [],
  _cols?: number,
  style = '',
): string {
  const out: string[] = [];
  for (const [k, v] of pairs) {
    const m = monoKeys.includes(k);
    out.push(`<dt>${esc(k)}</dt><dd class="${m ? 'm' : ''}">${v}</dd>`);
  }
  return `<dl class="kv" style="${style}">${out.join('')}</dl>`;
}

export type ColumnKind = 't' | 'm' | 'n' | 'c' | 's';

export function table(
  columns: [string, ColumnKind][],
  rows: string[][],
  cls = '',
  foot?: string[] | null,
  widths?: string[] | null,
  style = '',
): string {
  let cg = '';
  if (widths) {
    cg =
      '<colgroup>' +
      widths.map((w) => `<col style="width:${w}">`).join('') +
      '</colgroup>';
  }
  // units in parentheses keep their case (mm, µm)
  const th = columns
    .map(([h, k]) => {
      const clsAttr = k === 'n' ? 'n' : k === 'c' ? 'c' : '';
      const hdr = h.replace(
        /(\([^)]*\))/g,
        '<span class="nu">$1</span>',
      );
      return `<th class="${clsAttr}">${hdr}</th>`;
    })
    .join('');

  const body = rows
    .map((r) => {
      const tds = r
        .map((v, ci) => {
          const [, k] = columns[ci];
          if (k === 's') {
            const upper = typeof v === 'string' ? v.toUpperCase() : '';
            const isStatus = ['PASS', 'FAIL', 'PENDING', 'N/A'].includes(upper);
            const cell = isStatus ? status(v) : v;
            return `<td>${cell}</td>`;
          }
          const tdCls = ['n', 'm', 'c'].includes(k) ? k : '';
          return `<td class="${tdCls}">${v}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  let tf = '';
  if (foot) {
    tf =
      '<tfoot><tr>' +
      foot
        .map((v, ci) => {
          const [, k] = columns[ci];
          return `<td class="${k === 'n' ? 'n' : ''}">${v}</td>`;
        })
        .join('') +
      '</tr></tfoot>';
  }

  return `<table class="t ${cls}" style="${style}">${cg}<thead><tr>${th}</tr></thead><tbody>${body}</tbody>${tf}</table>`;
}

export function note(text: string, label = 'Note'): string {
  return `<div class="note"><span class="lab">${esc(label)}</span>${text}</div>`;
}

export function code(text: string): string {
  const lines = text
    .replace(/^\n/, '')
    .replace(/\n$/, '')
    .split('\n')
    .map((ln) => {
      let e = esc(ln);
      if (ln.trimStart().startsWith('#') || ln.trimStart().startsWith('//')) {
        e = `<span class="c">${e}</span>`;
      }
      return e;
    });
  return `<pre class="code">${lines.join('\n')}</pre>`;
}

export function checkbox(on: boolean, label: string): string {
  return `<span style="white-space:nowrap;margin-right:4mm"><span class="check ${on ? 'on' : ''}"></span>${esc(label)}</span>`;
}

export function num(
  v: number | null | undefined,
  nd?: number,
  sign = false,
  unit = '',
): string {
  if (v == null) return '\u2014'; // em dash
  let val = v;
  let showSign = sign;
  if (nd != null && typeof val === 'number' && Math.round(val * 10 ** nd) / 10 ** nd === 0) {
    // Round to `nd` places, check for -0
    val = 0.0;
    showSign = false;
  }
  let s: string;
  if (showSign && nd != null) {
    s = (val >= 0 ? '+' : '') + val.toFixed(nd);
  } else if (nd != null) {
    s = val.toFixed(nd);
  } else {
    s = String(val);
  }
  s = s.replace(/-/g, '\u2212'); // true minus U+2212
  return s + (unit ? ` ${unit}` : '');
}

// ----------------------------------------------------------------- QR code
export function qr_svg(
  url: string,
  sizeMm = 14.0,
  border = 1,
): string {
  // Generate QR matrix synchronously via qrcode
  // qrcode's create() returns a QRCode object with modules
  const qr = QRCode.create(url, {
    errorCorrectionLevel: 'M',
  } as any);
  const size = qr.modules.size;
  const data = qr.modules.data;
  const n = size + 2 * border;

  const d: string[] = [];
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (data[y * size + x]) {
        const x0 = x;
        while (x < size && data[y * size + x]) x++;
        d.push(`M${x0 + border} ${y + border}h${x - x0}v1h${x0 - x}z`);
      } else {
        x++;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" style="width:calc(${sizeMm}mm * var(--cs,1));height:calc(${sizeMm}mm * var(--cs,1))" shape-rendering="crispEdges">` +
    `<rect width="${n}" height="${n}" fill="#fff"/><path d="${d.join('')}" fill="#000"/></svg>`
  );
}

export function qr_block(
  url: string,
  sizeMm = 14.0,
  label?: string | null,
): string {
  const shown = label ?? url.replace('https://', '');
  return `<div class="qr">${qr_svg(url, sizeMm)}<div class="u">${esc(shown)}</div></div>`;
}

// ----------------------------------------------------------------- inspection stamp
export function stamp_svg(
  sn: string,
  date: string,
  initials: string,
  dMm: number = STAMP_DIAMETER,
  rotate: number = STAMP_ROTATION,
): string {
  const ink = STAMP_INK;
  const R = 160; // centre in SVG coords (viewBox 320×320)
  const top = STAMP_TOP_TEXT;
  const bottom = STAMP_BOTTOM_TEXT;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" style="width:calc(${dMm}mm * var(--cs,1));height:calc(${dMm}mm * var(--cs,1));display:block">
<defs>
 <path id="arcT" d="M 44 160 A 116 116 0 0 1 276 160"/>
 <path id="arcB" d="M 30 160 A 130 130 0 0 0 290 160"/>
</defs>
<g transform="rotate(${rotate} 160 160)" fill="${ink}" stroke="none">
 <circle cx="160" cy="160" r="${R - 4}" fill="none" stroke="${ink}" stroke-width="6"/>
 <circle cx="160" cy="160" r="${R - 47}" fill="none" stroke="${ink}" stroke-width="2.5"/>
 <text font-family="Geist" font-weight="900" font-size="27" letter-spacing="3.2" text-anchor="middle">
   <textPath href="#arcT" startOffset="50%">${top}</textPath></text>
 <text font-family="Geist Mono" font-weight="500" font-size="17.5" letter-spacing="2.2" text-anchor="middle">
   <textPath href="#arcB" startOffset="50%">${bottom}</textPath></text>
 <rect x="20.5" y="153.5" width="13" height="13"/>
 <rect x="286.5" y="153.5" width="13" height="13"/>
 <line x1="88" y1="132" x2="232" y2="132" stroke="${ink}" stroke-width="2"/>
 <text x="160" y="172.5" font-family="Geist Pixel" font-size="32" text-anchor="middle" letter-spacing="0.6" stroke="${ink}" stroke-width="1.1" stroke-linejoin="miter">INSPECTED</text>
 <line x1="88" y1="186" x2="232" y2="186" stroke="${ink}" stroke-width="2"/>
 <text x="160" y="119" font-family="Geist Mono" font-weight="500" font-size="18" text-anchor="middle" letter-spacing="1">SN ${esc(sn)}</text>
 <text x="160" y="211" font-family="Geist Mono" font-weight="500" font-size="17" text-anchor="middle" letter-spacing="0.5">${esc(date)}</text>
 <text x="160" y="234" font-family="Geist Mono" font-weight="700" font-size="17" text-anchor="middle" letter-spacing="2">${esc(initials)}</text>
</g></svg>`;
}

// ----------------------------------------------------------------- signature
export function signature(
  name: string,
  role: string,
  date: string,
  sigText?: string | null,
  stamp?: [string, string, string] | null,
  noteText?: string | null,
): string {
  const st = stamp
    ? `<div class="stamp">${stamp_svg(...stamp)}</div>`
    : '';
  const nt = noteText ? `<br>${noteText}` : '';
  return (
    `<div class="sig"><div class="who"><div class="tag">Signed</div><div class="line">${esc(sigText ?? '')}</div>` +
    `<div class="lab">${esc(name)} \u00B7 ${esc(role)} \u00B7 <span class="mono">${esc(date)}</span>${nt}</div></div>${st}</div>`
  );
}

// ----------------------------------------------------------------- document
export interface RenderResult {
  pages: number;
  overflow: [string, number, number, number][];
  free_mm: Record<string, number[]>;
}

export class Doc {
  number: string;
  rev: string;
  date: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  sn?: string;
  watermark?: string;
  headerId: string;
  footerLeft: string;
  pages: string[] = [];

  constructor(
    number: string,
    rev: string,
    date: string,
    eyebrow: string,
    title: string,
    sn?: string,
    subtitle?: string,
    watermark?: string,
    footerLeft?: string,
    headerId?: string,
  ) {
    this.number = number;
    this.rev = rev;
    this.date = date;
    this.eyebrow = eyebrow;
    this.title = title;
    this.subtitle = subtitle;
    this.sn = sn;
    this.watermark = watermark;
    this.headerId =
      headerId ??
      [number, rev ? `Rev ${rev}` : null, date]
        .filter(Boolean)
        .join(' \u00B7 ');
    this.footerLeft =
      footerLeft ??
      CONTACT_LINE + (sn ? ` \u00B7 calib.tools/verify/${sn}` : '');
  }

  addPage(bodyHtml: string, titleBlock?: boolean): void {
    const insertTitle = titleBlock ?? this.pages.length === 0;
    let tb = '';
    if (insertTitle) {
      tb = `<div class="eyebrow">${esc(this.eyebrow)}</div><h1>${esc(this.title)}</h1>`;
      if (this.subtitle) {
        tb += `<div class="sub">${this.subtitle}</div>`;
      } else {
        tb += '<div style="height:2.5mm"></div>';
      }
    }
    this.pages.push(tb + bodyHtml);
  }

  // Alias matching Python name
  add_page(bodyHtml: string, titleBlock?: boolean): void {
    this.addPage(bodyHtml, titleBlock);
  }

  html(paper = 'A4'): string {
    const N = this.pages.length;
    const out: string[] = [];
    for (let i = 0; i < N; i++) {
      const b = this.pages[i];
      const wm = this.watermark
        ? `<div class="wm">${esc(this.watermark)}</div>`
        : '';
      out.push(`<section class="page">
<div class="hdr"><img src="file://${WORDMARK_SVG}" alt="CALIB.TOOLS"><div class="id">${esc(this.headerId)}</div></div>
<div class="body"><div class="zin">${b}</div></div>
<div class="ftr"><span>${esc(this.footerLeft)}</span><span class="pg">Page ${i + 1} / ${N}</span></div>${wm}
</section>`);
    }
    return (
      `<!doctype html><html><head><meta charset='utf-8'><title>${esc(this.number)}</title>` +
      `<style>${baseCss(paper)}</style></head><body>${out.join('')}</body></html>`
    );
  }

  async render(
    outBase: string,
    papers: string[] = ['A4', 'Letter'],
    previews = true,
    previewDpi = 70,
  ): Promise<RenderResult> {
    const { chromium } = await import('@playwright/test');
    fs.mkdirSync(path.dirname(outBase), { recursive: true });

    const report: Record<string, Array<{ page: number; over_mm: number; over_w_mm: number; free_mm: number }>> = {};
    const browser = await chromium.launch();

    for (const paper of papers) {
      const [W, H] = PAPER[paper];
      const hp = `${outBase}${paper === 'A4' ? '' : '-letter'}.html`;
      fs.writeFileSync(hp, this.html(paper));
      const pg = await browser.newPage();
      await pg.goto(`file://${hp}`);
      await pg.evaluate(() => (document.fonts as any).ready.then(() => true));
      await pg.waitForTimeout(300);

      const over = await pg.evaluate(`(() => Array.from(document.querySelectorAll('.page .body')).map((b, i) => {
                    const r = b.getBoundingClientRect(); let maxB = 0, maxR = 0;
                    b.querySelectorAll('.zin *').forEach(e => { if (e.tagName.toLowerCase() !== 'svg' && e.closest('svg')) return; const q = e.getBoundingClientRect(); if (q.height>0) { maxB = Math.max(maxB, q.bottom); maxR = Math.max(maxR, q.right);} });
                    return {page: i+1, over_mm: Math.max(0, (Math.max(b.scrollHeight - b.clientHeight, maxB - r.bottom)) * 25.4/96),
                            over_w_mm: Math.max(0, (Math.max(b.scrollWidth - b.clientWidth, maxR - r.right)) * 25.4/96),
                            free_mm: Math.max(0, (r.bottom - maxB) * 25.4/96)}; }))()`);

      const pdfPath = `${outBase}${paper === 'A4' ? '' : '-letter'}.pdf`;
      await pg.pdf({
        path: pdfPath,
        width: `${W}mm`,
        height: `${H}mm`,
        printBackground: true,
        preferCSSPageSize: true,
      });
      await pg.close();
      fs.unlinkSync(hp);
      report[paper] = over as any;
    }
    await browser.close();

    if (previews) {
      const { execSync } = await import('node:child_process');
      // Remove old previews
      const existing = fs.readdirSync(path.dirname(outBase)).filter(
        (f) => f.startsWith(path.basename(outBase) + '-p') && f.endsWith('.png'),
      );
      for (const f of existing) {
        fs.unlinkSync(path.join(path.dirname(outBase), f));
      }
      try {
        execSync(
          `pdftoppm -r ${previewDpi} -png "${outBase}.pdf" "${outBase}-p"`,
        );
      } catch {
        // pdftoppm not available — skip previews silently
      }
    }

    const bad: [string, number, number, number][] = [];
    for (const [paper, lst] of Object.entries(report)) {
      for (const o of lst) {
        if (o.over_mm > 0.3 || o.over_w_mm > 0.3) {
          bad.push([paper, o.page, Math.round(o.over_mm * 10) / 10, Math.round(o.over_w_mm * 10) / 10]);
        }
      }
    }
    const free: Record<string, number[]> = {};
    for (const [paper, lst] of Object.entries(report)) {
      free[paper] = lst.map((o) => Math.round(o.free_mm * 10) / 10);
    }
    const baseName = path.basename(outBase);
    console.log(
      `${baseName}: ${this.pages.length} pages; overflow=${bad.length === 0 ? 'none' : JSON.stringify(bad)}; free space mm=${JSON.stringify(free)}`,
    );
    return { pages: this.pages.length, overflow: bad, free_mm: free };
  }
}

// Re-export baseCss as base_css for Python-name compatibility
export { baseCss as base_css };
