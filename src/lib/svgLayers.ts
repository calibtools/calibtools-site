/**
 * Shared SVG layers used by all pattern renderers:
 * opening/closing tags, white background, scale bar, and brand footer.
 */
import type { PatternSpec } from './patterns';
import { idRange } from './idRange';
import {
  patternSummary,
  provenanceLine,
  PRINT_NOTE,
  SITE_URL,
  wordmarkSvgGroup,
} from './exportBrand';
import { GEIST_MONO_WOFF2_B64 } from './geistMonoBase64';
import type { BrandGeometry, AxesGeometry } from './pageLayout';

export interface SvgContext {
  spec: PatternSpec;
  pw: number; ph: number;
  ox: number; oy: number;
  bw: number; bh: number;
  /** Layout-computed brand geometry. If absent, falls back to legacy positioning. */
  brand?: BrandGeometry;
  /** Layout-computed axes geometry. If absent, falls back to legacy positioning. */
  axes?: AxesGeometry;
}

/** Opening `<svg>` tag + embedded font defs + white background rect. */
export function svgOpen(ctx: SvgContext): string {
  const { spec: s, pw, ph } = ctx;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}mm" height="${ph}mm" viewBox="0 0 ${pw} ${ph}" role="img" aria-label="${s.type} ${s.rows} by ${s.cols}">`,
    `<defs><style>@font-face{font-family:'Geist Mono';font-weight:500;src:url('data:font/woff2;base64,${GEIST_MONO_WOFF2_B64}') format('woff2');}</style></defs>`,
    `<rect width="${pw}" height="${ph}" fill="#fff"/>`,
  ].join('');
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

  // Use layout-computed geometry if available, else legacy inline computation
  const ax = ctx.axes;
  const isKalibr = ax ? ax.isKalibr : (s.type === 'AprilGrid (Kalibr)' && (s.symmetricCorners ?? false));
  const shorter = Math.min(bw, bh);
  const arrowLen = ax ? ax.arrowLen : Math.max(15, Math.min(40, shorter * 0.15));
  const shaft = ax ? ax.shaft : 0.4;
  const headLen = ax ? ax.headLen : Math.min(3, arrowLen * 0.2);
  const headW = ax ? ax.headW : headLen * 0.6;

  const originX = ax ? ax.originX : ox - 0.5 * s.square;
  const originY = ax ? ax.originY : (isKalibr ? oy + bh + 0.5 * s.square : oy - 0.5 * s.square);

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

/**
 * Corner ID badge: "#N" in the top-left quiet zone when startId ≠ 0.
 * Geist Mono, 10 mm cap height, ≥ 1.5 squares from the nearest pattern square.
 */
export function cornerIdBadgeSvg(ctx: SvgContext): string {
  const { spec: s, ox, oy } = ctx;
  // Only show when startId is non-zero and badge not explicitly disabled
  if (s.startId === 0 || s.showCornerBadge === false) return '';

  const range = idRange(s);
  if (!range) return '';

  // Position: top-left quiet zone, >= 1.5 squares from nearest pattern square
  const minGap = 1.5 * s.square;
  const badgeX = ox - minGap;
  const badgeY = oy - minGap + 10; // 10mm cap height — baseline at this Y
  const text = `#${s.startId}`;

  return `<text x="${badgeX}" y="${badgeY}" class="corner-id-badge" font-family="'Geist Mono', monospace" font-size="10" font-weight="700" fill="#333">${text}</text>`;
}

/** Brand footer group. Uses layout geometry when available, else 3-tier fallback. */
export function brandFooterSvg(ctx: SvgContext): string {
  const { spec: s, pw, ph, oy, bh } = ctx;

  // If layout brand geometry is provided, use it (new path)
  if (ctx.brand) {
    return layoutBrandFooter(ctx);
  }

  // Legacy 3-tier fallback
  const patternBottom = oy + bh;
  const scaleBarEnd = s.scaleBar ? patternBottom + 8 + 6 : patternBottom;

  const fullFooterY = Math.max(scaleBarEnd + 4, patternBottom + 2 * s.square);
  if (fullFooterY + 10 < ph) {
    return legacyFullBrandFooter(ctx, fullFooterY);
  }

  const compactY = Math.max(scaleBarEnd + 2, patternBottom + 4);
  if (compactY + 6 < ph) {
    return legacyCompactBrandFooter(ctx, compactY);
  }

  return `<text x="${pw / 2}" y="${ph - 2}" font-family="'Geist Mono', monospace" font-size="1.8" text-anchor="middle" fill="#999">Brand footer omitted \u2014 page too small</text>`;
}

/** Brand footer using layout-computed geometry: wordmark bottom-left, text to its right. */
function layoutBrandFooter(ctx: SvgContext): string {
  const { spec: s } = ctx;
  const b = ctx.brand!;
  const parts: string[] = [];
  const summary = patternSummary({
    type: s.type, rows: s.rows, cols: s.cols, square: s.square,
    marker: s.marker, dict: s.dict, startId: s.startId,
  });
  const provenance = provenanceLine('generator');

  parts.push('<g id="calibtools-brand">');
  // Bracket-framed wordmark at layout position
  parts.push(wordmarkSvgGroup({ x: b.wmX, y: b.wmY, heightMm: b.wmH }));
  // Text lines to the right of the wordmark
  const fs = 2.47; // 7 pt in mm
  parts.push(`<text x="${b.textX}" y="${b.textY}" font-family="'Geist Mono', monospace" font-size="${fs}" fill="#333333">${summary}</text>`);
  parts.push(`<text x="${b.textX}" y="${b.textY + b.textLineH}" font-family="'Geist Mono', monospace" font-size="${fs}" fill="#666666">${provenance}</text>`);
  parts.push(`<text x="${b.textX}" y="${b.textY + 2 * b.textLineH}" font-family="'Geist Mono', monospace" font-size="${fs}" fill="#999999">${PRINT_NOTE}</text>`);
  parts.push('</g>');
  return parts.join('');
}

function legacyFullBrandFooter(ctx: SvgContext, footerY: number): string {
  const { spec: s, pw, ox, bw } = ctx;
  const parts: string[] = [];
  const wmHeight = 5;
  const summary = patternSummary({
    type: s.type, rows: s.rows, cols: s.cols, square: s.square,
    marker: s.marker, dict: s.dict, startId: s.startId,
  });
  const provenance = provenanceLine('generator');
  parts.push('<g id="calibtools-brand">');
  parts.push(wordmarkSvgGroup({ x: ox, y: footerY, heightMm: wmHeight }));
  const textY = footerY + wmHeight + 2;
  parts.push(`<text x="${ox + bw / 2}" y="${textY}" font-family="'Geist Mono', monospace" font-size="2.2" text-anchor="middle" fill="#333333">${summary}</text>`);
  parts.push(`<text x="${ox + bw / 2}" y="${textY + 3.2}" font-family="'Geist Mono', monospace" font-size="1.8" text-anchor="middle" fill="#666666">${provenance}</text>`);
  parts.push(`<text x="${ox + bw / 2}" y="${textY + 6}" font-family="'Geist Mono', monospace" font-size="1.6" text-anchor="middle" fill="#999999">${PRINT_NOTE}</text>`);
  parts.push('</g>');
  return parts.join('');
}

function legacyCompactBrandFooter(ctx: SvgContext, footerY: number): string {
  const { spec: s, ox } = ctx;
  const parts: string[] = [];
  const wmHeight = 3;
  const summary = patternSummary({
    type: s.type, rows: s.rows, cols: s.cols, square: s.square,
    marker: s.marker, dict: s.dict, startId: s.startId,
  });
  const provenance = provenanceLine('generator');
  parts.push('<g id="calibtools-brand">');
  parts.push(wordmarkSvgGroup({ x: ox, y: footerY, heightMm: wmHeight }));
  const wmWidth = wmHeight * (7796.4 / 1857.4);
  const textX = ox + wmWidth + 2;
  const textY = footerY + wmHeight * 0.7;
  parts.push(`<text x="${textX}" y="${textY}" font-family="'Geist Mono', monospace" font-size="1.8" fill="#666">${summary} \u00B7 ${provenance}</text>`);
  parts.push('</g>');
  return parts.join('');
}
