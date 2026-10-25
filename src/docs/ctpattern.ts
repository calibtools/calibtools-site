/**
 * Vector renderings of Calib.Tools boards (exact ArUco bits from dictionary JSON)
 * for customer documents.
 *
 * All coordinates are millimetres on the board: origin of the SVG = top-left corner
 * of the board. Pattern rule (OpenCV >= 4.6 layout): black square top-left,
 * (r + c) even = black, ArUco markers in the white squares, IDs row-major from
 * start_id. ChArUco corner id = r * (cols - 1) + c at pattern coordinates
 * ((c + 1) * sq, (r + 1) * sq) — OpenCV frame: origin = top-left OUTER corner of the
 * pattern, X right, Y down.
 *
 * Ported from ctpattern.py — uses getArUcoDict + decodeMarkerBits instead of cv2.
 */

import { getArUcoDict, decodeMarkerBits } from '../lib/dicts/dicts';

// ── Brand / drawing colours ──────────────────────────────────────────────────
export const RED = '#E60012';
export const GREEN = '#00A651';
export const INK = '#282828';
export const G80 = '#333333';
export const G60 = '#666666';
export const G30 = '#B3B3B3';
export const G10 = '#E6E6E6';
export const G05 = '#F2F2F2';

// ── Corner list ──────────────────────────────────────────────────────────────

export type CornerEntry = [id: number, r: number, c: number, x: number, y: number];

/**
 * Returns [(id, r, c, x_nom, y_nom)] in the OpenCV pattern frame (mm).
 */
export function corner_list(rows: number, cols: number, sq: number): CornerEntry[] {
  const out: CornerEntry[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      out.push([r * (cols - 1) + c, r, c, (c + 1) * sq, (r + 1) * sq]);
    }
  }
  return out;
}

// ── Marker helpers ───────────────────────────────────────────────────────────

/**
 * Get the black-cell mask for ArUco marker `mid` from `dict_name`.
 * Returns { mask, n } where mask[y][x] = true means black cell, and n is the
 * total grid size (markerSize + 2, including the 1-cell black border).
 */
function _marker_cells(
  dict_name: string,
  mid: number,
): { mask: boolean[][]; n: number } {
  const dict = getArUcoDict(dict_name);
  if (!dict || mid >= dict.count) {
    throw new Error(`Unknown dict/marker: ${dict_name}#${mid}`);
  }
  const markerSize = dict.markerSize;
  const bits = decodeMarkerBits(dict.bits[mid], markerSize);
  const border = 1;
  const n = markerSize + 2 * border;
  const mask: boolean[][] = [];
  for (let y = 0; y < n; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < n; x++) {
      const inBorder =
        y < border || y >= n - border || x < border || x >= n - border;
      if (inBorder) {
        row.push(true); // border cells are always black
      } else {
        // bits: 0 = black, 1 = white (OpenCV convention)
        row.push(bits[y - border][x - border] === 0);
      }
    }
    mask.push(row);
  }
  return { mask, n };
}

/**
 * Run-length encode horizontal runs of `true` cells into a compact SVG `<path>`.
 */
function _runs(
  mask: boolean[][],
  x0: number,
  y0: number,
  cell: number,
  fill: string,
): string {
  const parts: string[] = [];
  for (let yy = 0; yy < mask.length; yy++) {
    let x = 0;
    while (x < mask[yy].length) {
      if (mask[yy][x]) {
        const s = x;
        while (x < mask[yy].length && mask[yy][x]) {
          x++;
        }
        parts.push(
          `M${(x0 + s * cell).toFixed(4)} ${(y0 + yy * cell).toFixed(4)}` +
            `h${((x - s) * cell).toFixed(4)}` +
            `v${cell.toFixed(4)}` +
            `h${(-(x - s) * cell).toFixed(4)}z`,
        );
      } else {
        x++;
      }
    }
  }
  return parts.length
    ? `<path d="${parts.join('')}" fill="${fill}"/>`
    : '';
}

// ── Arrows & axes ────────────────────────────────────────────────────────────

/**
 * SVG arrow from (x0,y0) to (x1,y1) with a triangular head.
 */
export function arrow(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colour: string,
  w: number,
  head: number,
): string {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const bx = x1 - head * Math.cos(ang);
  const by = y1 - head * Math.sin(ang);
  const lx = bx + head * 0.45 * Math.sin(ang);
  const ly = by - head * 0.45 * Math.cos(ang);
  const rx = bx - head * 0.45 * Math.sin(ang);
  const ry = by + head * 0.45 * Math.cos(ang);
  return (
    `<line x1="${x0}" y1="${y0}" x2="${bx.toFixed(3)}" y2="${by.toFixed(3)}" stroke="${colour}" stroke-width="${w}"/>` +
    `<path d="M${x1} ${y1}L${lx.toFixed(3)} ${ly.toFixed(3)}L${rx.toFixed(3)} ${ry.toFixed(3)}Z" fill="${colour}"/>`
  );
}

/**
 * Red X arrow to the right, green Y arrow down — printed in the top-left margin
 * of every board.
 */
export function axes(
  ox: number,
  oy: number,
  length: number,
  scale = 1.0,
  labels = true,
): string {
  const w = 0.55 * scale;
  const head = 1.8 * scale;
  let s =
    arrow(ox, oy, ox + length, oy, RED, w, head) +
    arrow(ox, oy, ox, oy + length, GREEN, w, head);
  if (labels) {
    const fs = 3.2 * scale;
    s +=
      `<text x="${ox + length + 1.0 * scale}" y="${oy + fs * 0.36}" font-family="Geist" font-weight="700" font-size="${fs}" fill="${RED}">X</text>` +
      `<text x="${ox}" y="${oy + length + 1.0 * scale + fs * 0.72}" font-family="Geist" font-weight="700" font-size="${fs}" fill="${GREEN}" text-anchor="middle">Y</text>`;
  }
  s += `<circle cx="${ox}" cy="${oy}" r="${0.6 * scale}" fill="${INK}"/>`;
  return s;
}

// ── Label line ───────────────────────────────────────────────────────────────

/**
 * Board label line (compact wordmark + Geist Mono, one colour) scaled to
 * `width` mm, left edge at x.
 *
 * Simplified port: renders "CALIB.TOOLS" as Geist Bold text and the remainder
 * as Geist Mono, wrapped in a <g> that scales to fit `width` mm.
 */
export function label_line_frag(
  line: string,
  x: number,
  y_centre: number,
  width: number,
  colour = G80,
): { svg: string; height: number } {
  if (!line.startsWith('CALIB.TOOLS')) {
    throw new Error('Label must start with "CALIB.TOOLS"');
  }
  const after = line.slice('CALIB.TOOLS'.length).trim();

  // Approximate glyph widths (mm at font-size 10): Geist Bold ~5.8/char, Mono ~6.0/char
  const brandText = 'CALIB.TOOLS';
  const brandWidth = brandText.length * 5.8; // approx at fs=10
  const gap = after ? 3 : 0;
  const afterWidth = after ? after.length * 6.0 : 0;
  const totalNatural = brandWidth + gap + afterWidth; // at fs=10
  const fs = 10;
  const s = width / totalNatural; // uniform scale

  const brandSvg = `<text x="0" y="${fs * 0.36}" font-family="Geist" font-weight="700" font-size="${fs}" fill="${colour}">${brandText}</text>`;
  const afterSvg = after
    ? `<text x="${brandWidth + gap}" y="${fs * 0.36}" font-family="Geist Mono" font-size="${fs}" fill="${colour}">${after}</text>`
    : '';

  const ty = y_centre - s * fs * 0.36; // vertical centre
  const svg = `<g transform="translate(${(x).toFixed(4)} ${ty.toFixed(4)}) scale(${s.toFixed(6)})">${brandSvg}${afterSvg}</g>`;
  const height = s * fs;
  return { svg, height };
}

// ── Board SVG ────────────────────────────────────────────────────────────────

export interface BoardSvgOpts {
  W: number;
  H: number;
  rows: number;
  cols: number;
  sq: number;
  marker?: number;
  mx?: number;
  my?: number;
  dict_name?: string;
  start_id?: number;
  label?: string;
  label_w?: number;
  axes_spec?: [number, number, number, number] | null;
  mode?: 'print' | 'map';
  width_mm?: number;
  height_mm?: number;
  outline?: boolean;
  corners?: boolean;
  corner_ids?: boolean;
  vectors?: Record<number, [number, number]>;
  vec_scale?: number;
  highlight?: number[];
  origin?: boolean;
  pad?: number;
  extra?: string;
  radius?: number;
}

/**
 * Return an SVG string of the board.
 *
 * mode 'print' = true black/white; 'map' = pattern faded to greys for annotated
 * feature maps.
 *
 * vectors: { corner_id: [dx_um, dy_um] } drawn from the nominal corner, magnified
 * vec_scale times.
 *
 * highlight: list of corner ids ringed.
 *
 * pad: extra mm around the board in the viewBox.
 *
 * extra: SVG appended (board mm coords).
 */
export function board_svg(opts: BoardSvgOpts): string {
  const {
    W,
    H,
    rows,
    cols,
    sq,
    marker,
    dict_name = 'DICT_6X6_250',
    start_id = 0,
    label,
    label_w,
    axes_spec = [4.5, 4.5, 6.5, 0.6],
    mode = 'print',
    width_mm,
    height_mm,
    outline = true,
    corners = false,
    corner_ids = false,
    vectors,
    vec_scale = 2000.0,
    highlight,
    origin = false,
    pad = 0.0,
    extra = '',
    radius = 0.0,
  } = opts;

  const mx = opts.mx ?? (W - cols * sq) / 2;
  const my = opts.my ?? (H - rows * sq) / 2;

  const [sq_fill, mk_fill, txt] =
    mode === 'print' ? ['#000', '#000', G80] : [G10, G30, G30];

  const out: string[] = [];

  // Board background
  out.push(
    `<rect x="0" y="0" width="${W}" height="${H}" rx="${radius}" fill="#fff" ` +
      `stroke="${mode === 'print' ? G60 : G30}" stroke-width="${outline ? 0.35 : 0}"/>`,
  );

  // Black squares (combined path)
  const black: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = mx + c * sq;
      const y0 = my + r * sq;
      if ((r + c) % 2 === 0) {
        black.push(`M${x0.toFixed(4)} ${y0.toFixed(4)}h${sq}v${sq}h${-sq}z`);
      }
    }
  }
  out.push(`<path d="${black.join('')}" fill="${sq_fill}"/>`);

  // ArUco markers
  if (marker) {
    let nid = start_id;
    const off = (sq - marker) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 1) {
          const { mask, n } = _marker_cells(dict_name, nid);
          out.push(
            _runs(mask, mx + c * sq + off, my + r * sq + off, marker / n, mk_fill),
          );
          nid++;
        }
      }
    }
  }

  // Label
  if (label) {
    const lw = label_w ?? cols * sq;
    const yc = my + rows * sq + (H - my - rows * sq) / 2;
    const { svg: frag } = label_line_frag(
      label,
      mx,
      yc,
      lw,
      mode === 'map' ? txt : G80,
    );
    out.push(frag);
  }

  // Axes
  if (axes_spec) {
    out.push(axes(axes_spec[0], axes_spec[1], axes_spec[2], axes_spec[3]));
  }

  // Corner-dependent annotations
  const cl = corner_list(rows, cols, sq);

  // Deviation vectors
  if (vectors) {
    const vs: string[] = [];
    for (const [cid, , , xn, yn] of cl) {
      if (vectors[cid] !== undefined) {
        const [dx, dy] = vectors[cid];
        const x1 = mx + xn;
        const y1 = my + yn;
        vs.push(
          `<line x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" ` +
            `x2="${(x1 + (dx * vec_scale) / 1000).toFixed(3)}" ` +
            `y2="${(y1 + (dy * vec_scale) / 1000).toFixed(3)}" ` +
            `stroke="#000" stroke-width="0.32" stroke-linecap="round"/>`,
        );
      }
    }
    out.push(vs.join(''));
  }

  // Corner dots
  if (corners) {
    out.push(
      cl
        .map(
          ([, , , xn, yn]) =>
            `<circle cx="${(mx + xn).toFixed(3)}" cy="${(my + yn).toFixed(3)}" r="0.42" fill="#000"/>`,
        )
        .join(''),
    );
  }

  // Corner IDs
  if (corner_ids) {
    const fs = Math.min(2.3, sq * 0.24);
    out.push(
      cl
        .map(
          ([cid, , , xn, yn]) =>
            `<text x="${(mx + xn + 0.55).toFixed(3)}" y="${(my + yn - 0.6).toFixed(3)}" ` +
            `font-family="Geist Mono" font-size="${fs}" fill="${G60}">${cid}</text>`,
        )
        .join(''),
    );
  }

  // Highlight circles
  if (highlight) {
    for (const cid of highlight) {
      const [, , , xn, yn] = cl[cid];
      out.push(
        `<circle cx="${(mx + xn).toFixed(3)}" cy="${(my + yn).toFixed(3)}" ` +
          `r="${(sq * 0.32).toFixed(2)}" fill="none" stroke="#000" stroke-width="0.35"/>`,
      );
    }
  }

  // Origin marker
  if (origin) {
    out.push(
      `<circle cx="${mx}" cy="${my}" r="1.3" fill="#fff" stroke="#000" stroke-width="0.35"/>` +
        `<circle cx="${mx}" cy="${my}" r="0.45" fill="#000"/>`,
    );
  }

  out.push(extra);

  // Build size + viewBox
  const sizeParts: string[] = [];
  if (width_mm) sizeParts.push(`width="${width_mm}mm"`);
  if (height_mm) sizeParts.push(`height="${height_mm}mm"`);
  const size = sizeParts.join(' ');
  const vb = `${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${size}>${out.join('')}</svg>`;
}

// ── Dimension lines ──────────────────────────────────────────────────────────

/**
 * Horizontal dimension line between x0 and x1 at height y (mm),
 * with optional extension lines from y=ext_from.
 */
export function dim_h(
  x0: number,
  x1: number,
  y: number,
  text: string,
  ext_from?: number,
  fs = 2.6,
  col = G60,
  sw = 0.2,
  gap = 0.8,
): string {
  let e = '';
  if (ext_from !== undefined) {
    e =
      `<line x1="${x0}" y1="${ext_from}" x2="${x0}" y2="${y + (y > ext_from ? 1 : -1)}" stroke="${col}" stroke-width="${sw}"/>` +
      `<line x1="${x1}" y1="${ext_from}" x2="${x1}" y2="${y + (y > ext_from ? 1 : -1)}" stroke="${col}" stroke-width="${sw}"/>`;
  }
  const a = 1.4;
  return (
    e +
    `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${col}" stroke-width="${sw}"/>` +
    `<path d="M${x0} ${y}l${a} ${-a * 0.35}v${a * 0.7}z M${x1} ${y}l${-a} ${-a * 0.35}v${a * 0.7}z" fill="${col}"/>` +
    `<rect x="${(x0 + x1) / 2 - text.length * fs * 0.32 - gap}" y="${y - fs * 0.62}" width="${text.length * fs * 0.64 + 2 * gap}" height="${fs * 1.2}" fill="#fff"/>` +
    `<text x="${(x0 + x1) / 2}" y="${y + fs * 0.36}" font-family="Geist Mono" font-size="${fs}" fill="#000" text-anchor="middle">${text}</text>`
  );
}

/**
 * Vertical dimension line between y0 and y1 at x (mm); label rotated -90 deg.
 */
export function dim_v(
  x: number,
  y0: number,
  y1: number,
  text: string,
  ext_from?: number,
  fs = 2.6,
  col = G60,
  sw = 0.2,
  gap = 0.8,
): string {
  let e = '';
  if (ext_from !== undefined) {
    e =
      `<line x1="${ext_from}" y1="${y0}" x2="${x + (x > ext_from ? 1 : -1)}" y2="${y0}" stroke="${col}" stroke-width="${sw}"/>` +
      `<line x1="${ext_from}" y1="${y1}" x2="${x + (x > ext_from ? 1 : -1)}" y2="${y1}" stroke="${col}" stroke-width="${sw}"/>`;
  }
  const a = 1.4;
  const cy = (y0 + y1) / 2;
  return (
    e +
    `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${col}" stroke-width="${sw}"/>` +
    `<path d="M${x} ${y0}l${-a * 0.35} ${a}h${a * 0.7}z M${x} ${y1}l${-a * 0.35} ${-a}h${a * 0.7}z" fill="${col}"/>` +
    `<g transform="rotate(-90 ${x} ${cy})">` +
    `<rect x="${x - text.length * fs * 0.32 - gap}" y="${cy - fs * 0.62}" width="${text.length * fs * 0.64 + 2 * gap}" height="${fs * 1.2}" fill="#fff"/>` +
    `<text x="${x}" y="${cy + fs * 0.36}" font-family="Geist Mono" font-size="${fs}" fill="#000" text-anchor="middle">${text}</text></g>`
  );
}

// ── Scale bar ────────────────────────────────────────────────────────────────

/**
 * 1:1 scale bar (mm units) — used on print sheets.
 */
export function scale_bar(
  x: number,
  y: number,
  length_mm = 100,
  ticks = 10,
  fs = 2.6,
): string {
  const s: string[] = [
    `<rect x="${x}" y="${y}" width="${length_mm}" height="1.6" fill="none" stroke="#000" stroke-width="0.25"/>`,
  ];
  for (let i = 0; i < ticks; i++) {
    if (i % 2 === 0) {
      s.push(
        `<rect x="${x + (i * length_mm) / ticks}" y="${y}" width="${length_mm / ticks}" height="1.6" fill="#000"/>`,
      );
    }
  }
  s.push(
    `<text x="${x}" y="${y + 1.6 + fs * 1.15}" font-family="Geist Mono" font-size="${fs}" fill="#000">0</text>`,
  );
  s.push(
    `<text x="${x + length_mm}" y="${y + 1.6 + fs * 1.15}" font-family="Geist Mono" font-size="${fs}" fill="#000" text-anchor="end">${length_mm} mm</text>`,
  );
  return s.join('');
}
