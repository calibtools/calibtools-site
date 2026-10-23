/**
 * Shared SVG layers used by all pattern renderers:
 * opening/closing tags, white background, scale bar, and brand footer.
 */
import {
  BRAND_RED, BRAND_INK, BRAND_URL, patternSummary, logoSvgPaths,
} from './brand';
import type { PatternSpec } from './patterns';

export interface SvgContext {
  spec: PatternSpec;
  pw: number; ph: number;
  ox: number; oy: number;
  bw: number; bh: number;
}

/** Opening `<svg>` tag + white background rect. */
export function svgOpen(ctx: SvgContext): string {
  const { spec: s, pw, ph } = ctx;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}mm" height="${ph}mm" viewBox="0 0 ${pw} ${ph}" role="img" aria-label="${s.type} ${s.rows} by ${s.cols}"><rect width="${pw}" height="${ph}" fill="#fff"/>`;
}

/** Closing `</svg>` tag. */
export function svgClose(): string {
  return '</svg>';
}

/** Scale bar SVG fragment, or empty string if scaleBar is false. */
export function scaleBarSvg(ctx: SvgContext): string {
  const { spec: s, ox, oy, bw, bh } = ctx;
  if (!s.scaleBar) return '';
  const parts: string[] = [];
  const y = oy + bh + 8;
  parts.push(`<rect x="${ox}" y="${y}" width="100" height="0.6" fill="#000"/>`);
  parts.push(`<text x="${ox}" y="${y + 4}" font-family="monospace" font-size="2.6" fill="#333">100 mm scale check</text>`);
  parts.push(`<text x="${ox + bw}" y="${y + 4}" font-family="monospace" font-size="2.6" fill="#333" text-anchor="end">${s.type.toLowerCase()} ${s.rows}x${s.cols} · ${s.square}/${s.marker} mm · ${s.dict} · Calib.Tools</text>`);
  return parts.join('');
}

/** Brand footer group, or empty string if it doesn't fit. */
export function brandFooterSvg(ctx: SvgContext): string {
  const { spec: s, pw, ph, ox, oy, bw, bh } = ctx;
  const patternBottom = oy + bh;
  const scaleBarEnd = s.scaleBar ? patternBottom + 8 + 6 : patternBottom;
  const footerY = Math.max(scaleBarEnd + 4, patternBottom + 2 * s.square);
  if (footerY + 10 >= ph) return '';
  const parts: string[] = [];
  const logoRects = logoSvgPaths({ x: ox, y: footerY, cellSize: 1.8, gap: 0.3 });
  const logoWidth = 3 * 1.8 + 2 * 0.3; // 3 cells + 2 gaps = 6
  const textX = ox + logoWidth + 2;
  const textY = footerY + 4.2;
  const summary = patternSummary({
    type: s.type, rows: s.rows, cols: s.cols, square: s.square,
    marker: s.marker, dict: s.dict, startId: s.startId,
  });
  const iso = new Date().toISOString().slice(0, 10);
  parts.push('<g id="calibtools-brand">');
  parts.push(...logoRects);
  parts.push(`<text x="${textX}" y="${textY}" font-family="'Geist', 'Inter', system-ui, sans-serif" font-size="4" font-weight="600" fill="${BRAND_INK}">calib<tspan fill="${BRAND_RED}">.tools</tspan></text>`);
  parts.push(`<path data-wordmark="outlined" aria-hidden="true" d=""/>`);
  parts.push(`<text x="${pw / 2}" y="${textY}" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="2.4" text-anchor="middle" fill="#4A4A4A">${summary}</text>`);
  parts.push(`<text x="${ox + bw}" y="${textY}" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="2.4" text-anchor="end" fill="#6B6B6B">${BRAND_URL} · ${iso}</text>`);
  parts.push('</g>');
  return parts.join('');
}
