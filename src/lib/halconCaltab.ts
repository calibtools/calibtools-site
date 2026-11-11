/**
 * HALCON calibration plate with rectangularly arranged marks (the gen_caltab layout):
 * equal black circular marks in a regular grid on a white field, a black frame around
 * them and a black triangle in the top-left corner of the frame.
 *
 * Geometry lives here and nowhere else (it joins patterns.ts in packages/core).
 * All lengths are millimeters; the origin is the center of the mark grid, x right,
 * y down, as in the description file. The file itself is written in meters.
 *
 * Proportions follow MVTec's gen_caltab documentation and its example file
 * (7 x 7 marks, 12.5 mm apart, diameter ratio 0.5):
 *   frame outer size  = (marks + 1) x mark distance      (100 mm in the example)
 *   frame line width  = mark distance / 4                (3.125 mm)
 *   mark diameter     = mark distance x diameter ratio   (6.25 mm)
 *   plate rim         = frame + mark distance / 10       (1.25 mm)
 *   triangle legs     = one mark distance along the frame from its top-left corner
 * The frame width and the rim are read off that one example. A customer's own
 * description file is the authority for their plate: read it with parseDescr.
 * Ref: https://www.mvtec.com/doc/halcon/2411/en/gen_caltab.html
 */

export interface CaltabParams {
  /** Marks in x (columns). */
  xNum: number;
  /** Marks in y (rows). */
  yNum: number;
  /** Distance between mark centers, mm. */
  markDist: number;
  /** Mark diameter divided by mark distance. */
  diameterRatio: number;
}

export interface Box { minX: number; minY: number; maxX: number; maxY: number }

export interface CaltabGeometry {
  rows: number;
  cols: number;
  /** Mark centers and radii, row by row from the top, left to right. */
  marks: { x: number; y: number; r: number }[];
  /** Outer border of the black frame. */
  frame: Box;
  /** Line width of the black frame. */
  frameWidth: number;
  /** Edge of the plate around the frame. */
  rim: Box;
  /** The two points where the triangle's long side meets the frame; null if the plate has no triangle. */
  triangle: [[number, number], [number, number]] | null;
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;

export function caltabGeometry(p: CaltabParams): CaltabGeometry {
  if (!Number.isInteger(p.xNum) || !Number.isInteger(p.yNum) || p.xNum < 2 || p.yNum < 2) throw new Error('A plate needs at least 2 x 2 marks.');
  if (!(p.markDist > 0)) throw new Error('Mark distance has to be positive.');
  if (!(p.diameterRatio > 0 && p.diameterRatio < 1)) throw new Error('Diameter ratio has to be between 0 and 1.');
  const d = p.markDist;
  const r = (d * p.diameterRatio) / 2;
  const halfW = ((p.xNum + 1) * d) / 2;
  const halfH = ((p.yNum + 1) * d) / 2;
  const marks: CaltabGeometry['marks'] = [];
  for (let row = 0; row < p.yNum; row++) {
    for (let col = 0; col < p.xNum; col++) {
      marks.push({ x: round((col - (p.xNum - 1) / 2) * d), y: round((row - (p.yNum - 1) / 2) * d), r: round(r) });
    }
  }
  const frame = { minX: round(-halfW), minY: round(-halfH), maxX: round(halfW), maxY: round(halfH) };
  const edge = d / 10;
  return {
    rows: p.yNum, cols: p.xNum, marks, frame,
    frameWidth: round(d / 4),
    rim: { minX: round(frame.minX - edge), minY: round(frame.minY - edge), maxX: round(frame.maxX + edge), maxY: round(frame.maxY + edge) },
    triangle: [[frame.minX, round(frame.minY + d)], [round(frame.minX + d), frame.minY]],
  };
}

/** Size of the plate (rim to rim), mm. */
export function caltabSize(g: CaltabGeometry): { w: number; h: number } {
  return { w: round(g.rim.maxX - g.rim.minX), h: round(g.rim.maxY - g.rim.minY) };
}

const m = (mm: number) => {
  const v = Math.round((mm / 1000) * 1e9) / 1e9;
  return Object.is(v, -0) ? '0' : String(v);
};

/**
 * Description file for HALCON (.descr), in meters. The two boxes are written in the
 * order HALCON uses: min x, max y, max x, min y.
 */
export function caltabDescr(g: CaltabGeometry): string {
  const { w, h } = caltabSize(g);
  const dist = g.cols > 1 ? g.marks[1].x - g.marks[0].x : 0;
  const lines = [
    '# Plate Description Version 2',
    '# Calibration plate with rectangularly arranged marks (gen_caltab layout)',
    '# Calib.Tools - https://calib.tools',
    '#',
    `# ${g.rows} rows x ${g.cols} columns`,
    `# Width, height of calibration plate [meter]: ${m(w)}, ${m(h)}`,
    `# Distance between mark centers [meter]: ${m(dist)}`,
    '',
    '# Number of marks in y-dimension (rows)',
    `r ${g.rows}`,
    '',
    '# Number of marks in x-dimension (columns)',
    `c ${g.cols}`,
    '',
    '# offset of coordinate system in z-dimension [meter] (optional):',
    'z 0',
    '',
    '# Rectangular border (rim and black frame) of calibration plate',
    '# rim of the calibration plate (min x, max y, max x, min y) [meter]:',
    `o ${m(g.rim.minX)} ${m(g.rim.maxY)} ${m(g.rim.maxX)} ${m(g.rim.minY)}`,
    '# outer border of the black frame (min x, max y, max x, min y) [meter]:',
    `i ${m(g.frame.minX)} ${m(g.frame.maxY)} ${m(g.frame.maxX)} ${m(g.frame.minY)}`,
  ];
  if (g.triangle) {
    lines.push('# triangular corner mark given by two corner points (x,y, x,y) [meter] (optional):');
    lines.push(`t ${m(g.triangle[0][0])} ${m(g.triangle[0][1])} ${m(g.triangle[1][0])} ${m(g.triangle[1][1])}`);
  }
  lines.push('# width of the black frame [meter]:', `w ${m(g.frameWidth)}`, '', '# calibration marks: x y radius [meter]');
  for (let row = 0; row < g.rows; row++) {
    lines.push('', `# calibration marks at y = ${m(g.marks[row * g.cols].y)} m`);
    for (let col = 0; col < g.cols; col++) {
      const k = g.marks[row * g.cols + col];
      lines.push(`${m(k.x)} ${m(k.y)} ${m(k.r)}`);
    }
  }
  return lines.join('\n') + '\n';
}

/** Reads a description file written by gen_caltab (or by caltabDescr) back into geometry, in mm. */
export function parseDescr(text: string): CaltabGeometry {
  let rows = 0, cols = 0, frameWidth = 0;
  let rim: Box | null = null, frame: Box | null = null;
  let triangle: CaltabGeometry['triangle'] = null;
  const marks: CaltabGeometry['marks'] = [];
  const mm = (s: string) => round(Number(s) * 1000);
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const t = line.split(/\s+/);
    const box = (): Box => ({ minX: mm(t[1]), maxY: mm(t[2]), maxX: mm(t[3]), minY: mm(t[4]) });
    if (t[0] === 'r') rows = Number(t[1]);
    else if (t[0] === 'c') cols = Number(t[1]);
    else if (t[0] === 'z') continue;
    else if (t[0] === 'o') rim = box();
    else if (t[0] === 'i') frame = box();
    else if (t[0] === 't') triangle = [[mm(t[1]), mm(t[2])], [mm(t[3]), mm(t[4])]];
    else if (t[0] === 'w') frameWidth = mm(t[1]);
    else if (t.length === 3 && t.every((v) => Number.isFinite(Number(v)))) marks.push({ x: mm(t[0]), y: mm(t[1]), r: mm(t[2]) });
    else throw new Error(`Unrecognized line in description file: "${line}"`);
  }
  if (!rows || !cols || !frame || !frameWidth) throw new Error('Description file is missing rows, columns, the frame or its width.');
  if (marks.length !== rows * cols) throw new Error(`Description file lists ${marks.length} marks, expected ${rows} x ${cols}.`);
  return { rows, cols, marks, frame, frameWidth, rim: rim ?? frame, triangle };
}

/**
 * Black-on-white drawing of the plate at 1:1 (1 user unit = 1 mm), centered on a board
 * of boardW x boardH mm. Throws if the plate does not fit on the board.
 */
export function caltabSvg(g: CaltabGeometry, boardW: number, boardH: number): string {
  const { w, h } = caltabSize(g);
  if (w > boardW || h > boardH) throw new Error(`Plate of ${w} x ${h} mm does not fit on a ${boardW} x ${boardH} mm board.`);
  const cx = boardW / 2 - (g.frame.minX + g.frame.maxX) / 2;
  const cy = boardH / 2 - (g.frame.minY + g.frame.maxY) / 2;
  const X = (x: number) => round(x + cx);
  const Y = (y: number) => round(y + cy);
  const f = g.frame, fw = g.frameWidth;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${boardW}mm" height="${boardH}mm" viewBox="0 0 ${boardW} ${boardH}">`,
    `<rect x="0" y="0" width="${boardW}" height="${boardH}" fill="#fff"/>`,
    // Frame: outer rectangle minus inner rectangle
    `<path data-part="frame" fill="#000" fill-rule="evenodd" d="M${X(f.minX)} ${Y(f.minY)}H${X(f.maxX)}V${Y(f.maxY)}H${X(f.minX)}ZM${X(f.minX + fw)} ${Y(f.minY + fw)}V${Y(f.maxY - fw)}H${X(f.maxX - fw)}V${Y(f.minY + fw)}Z"/>`,
  ];
  if (g.triangle) {
    const [a, b] = g.triangle;
    const corner: [number, number] = [Math.min(a[0], b[0]), Math.min(a[1], b[1])];
    parts.push(`<path data-part="triangle" fill="#000" d="M${X(corner[0])} ${Y(corner[1])}L${X(a[0])} ${Y(a[1])}L${X(b[0])} ${Y(b[1])}Z"/>`);
  }
  for (const k of g.marks) parts.push(`<circle data-part="mark" cx="${X(k.x)}" cy="${Y(k.y)}" r="${k.r}" fill="#000"/>`);
  parts.push('</svg>');
  return parts.join('');
}

/** Largest mark distance in whole half-millimeters at which xNum x yNum marks fit on a board with the given margin. */
export function largestMarkDist(xNum: number, yNum: number, boardW: number, boardH: number, margin: number): number {
  const fit = Math.min((boardW - 2 * margin) / (xNum + 1 + 0.2), (boardH - 2 * margin) / (yNum + 1 + 0.2));
  return Math.floor(fit * 2) / 2;
}
