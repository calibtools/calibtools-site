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

/**
 * Coordinate-frame axes group.
 * X = brand red #E60012 pointing right, Y = green #1BA55A pointing down (OpenCV).
 * For Kalibr preset: origin bottom-left, Y up.
 * Axes in quiet zone, start >= 0.5 square from first pattern square.
 * Arrowhead <= 3 mm. Shaft 0.4 mm.
 */
export function axesSvg(ctx: SvgContext): string {
  const { spec: s, ox, oy, bw, bh } = ctx;
  if (s.showAxes === false) return '';

  const mono = s.monochromeAxes ?? false;
  const isKalibr = s.type === 'AprilGrid (Kalibr)' && s.symmetricCorners;

  // Arrow length: 15% of shorter board side, clamped [15, 40] mm
  const shorter = Math.min(bw, bh);
  const arrowLen = Math.max(15, Math.min(40, shorter * 0.15));
  const shaft = 0.4;
  const headLen = Math.min(3, arrowLen * 0.2);
  const headW = headLen * 0.6;

  // Origin: 0.5 squares before pattern top-left (OpenCV) or bottom-left (Kalibr)
  const gap = 0.5 * s.square;
  const originX = ox - gap;
  const originY = isKalibr ? oy + bh + gap : oy - gap;

  const xColor = mono ? '#000' : '#E60012';
  const yColor = mono ? '#000' : '#1BA55A';
  const yDash = mono ? ' stroke-dasharray="2,1.5"' : '';

  const parts: string[] = [];
  parts.push('<g id="calibtools-axes">');

  // X arrow: pointing right
  const xEnd = originX + arrowLen;
  parts.push(`<line x1="${originX}" y1="${originY}" x2="${xEnd - headLen}" y2="${originY}" stroke="${xColor}" stroke-width="${shaft}"/>`);
  parts.push(`<polygon points="${xEnd},${originY} ${xEnd - headLen},${originY - headW} ${xEnd - headLen},${originY + headW}" fill="${xColor}"/>`);
  parts.push(`<text x="${xEnd + 1}" y="${originY + 1}" font-family="'Geist Mono', monospace" font-size="2.5" fill="${xColor}">X</text>`);

  // Y arrow: pointing down (OpenCV) or up (Kalibr)
  const yDir = isKalibr ? -1 : 1;
  const yEnd = originY + yDir * arrowLen;
  parts.push(`<line x1="${originX}" y1="${originY}" x2="${originX}" y2="${yEnd - yDir * headLen}" stroke="${yColor}" stroke-width="${shaft}"${yDash}/>`);
  parts.push(`<polygon points="${originX},${yEnd} ${originX - headW},${yEnd - yDir * headLen} ${originX + headW},${yEnd - yDir * headLen}" fill="${yColor}"/>`);
  parts.push(`<text x="${originX + 1.5}" y="${yEnd + yDir * 2.5}" font-family="'Geist Mono', monospace" font-size="2.5" fill="${yColor}">Y</text>`);

  // Origin dot
  parts.push(`<circle cx="${originX}" cy="${originY}" r="0.8" fill="#000"/>`);

  // Caption
  const caption = isKalibr ? 'Kalibr frame \u00B7 origin bottom-left' : 'OpenCV frame \u00B7 origin top-left';
  parts.push(`<text x="${originX + 3}" y="${originY + (isKalibr ? 3 : -2)}" font-family="'Geist Mono', monospace" font-size="1.8" fill="#666">${caption}</text>`);

  parts.push('</g>');
  return parts.join('');
}

/** Brand footer group with 3-tier fallback. Never silently omitted. */
export function brandFooterSvg(ctx: SvgContext): string {
  const { spec: s, pw, ph, oy, bh } = ctx;
  const patternBottom = oy + bh;
  const scaleBarEnd = s.scaleBar ? patternBottom + 8 + 6 : patternBottom;

  // Tier 1: Full footer (needs ~12mm below scaleBar or ~2*square below pattern)
  const fullFooterY = Math.max(scaleBarEnd + 4, patternBottom + 2 * s.square);
  if (fullFooterY + 10 < ph) {
    return fullBrandFooter(ctx, fullFooterY);
  }

  // Tier 2: Compact one-line footer (needs ~6mm)
  const compactY = Math.max(scaleBarEnd + 2, patternBottom + 4);
  if (compactY + 6 < ph) {
    return compactBrandFooter(ctx, compactY);
  }

  // Tier 3: Warning text — never silently omit
  return `<text x="${pw / 2}" y="${ph - 2}" font-family="'Geist Mono', monospace" font-size="1.8" text-anchor="middle" fill="#999">Brand footer omitted \u2014 page too small</text>`;
}

function fullBrandFooter(ctx: SvgContext, footerY: number): string {
  const { spec: s, pw, ox, bw } = ctx;
  const parts: string[] = [];
  const logoRects = logoSvgPaths({ x: ox, y: footerY, cellSize: 1.8, gap: 0.3 });
  const logoWidth = 3 * 1.8 + 2 * 0.3;
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

function compactBrandFooter(ctx: SvgContext, footerY: number): string {
  const { spec: s, ox } = ctx;
  const parts: string[] = [];
  // Smaller logo: cellSize 1.2, gap 0.2
  const logoRects = logoSvgPaths({ x: ox, y: footerY, cellSize: 1.2, gap: 0.2 });
  const logoWidth = 3 * 1.2 + 2 * 0.2;
  const textX = ox + logoWidth + 1.5;
  const textY = footerY + 2.8;
  const summary = patternSummary({
    type: s.type, rows: s.rows, cols: s.cols, square: s.square,
    marker: s.marker, dict: s.dict, startId: s.startId,
  });
  parts.push('<g id="calibtools-brand">');
  parts.push(...logoRects);
  parts.push(`<text x="${textX}" y="${textY}" font-family="'Geist Mono', monospace" font-size="2" fill="#666">${summary} \u00B7 calib.tools</text>`);
  parts.push('</g>');
  return parts.join('');
}
