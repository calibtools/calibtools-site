/**
 * Embed a simple SVG (paths + rects) into a pdf-lib PDFPage.
 *
 * Handles the Calib.Tools brand SVGs which contain <path d="...">, <rect>,
 * and a single fill colour per <g> or element. No transforms, no strokes
 * beyond what we handle here.
 */
import type { PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';

interface SvgEmbedOpts {
  /** SVG string */
  svg: string;
  /** Target x position in PDF points (left edge) */
  x: number;
  /** Target y position in PDF points (bottom edge) */
  y: number;
  /** Target width in PDF points — SVG is scaled to fit */
  width: number;
}

/**
 * Draw the wordmark SVG onto a PDFPage at the given position and width.
 * Height is derived from the SVG aspect ratio.
 */
export function drawSvgOnPage(page: PDFPage, opts: SvgEmbedOpts): void {
  const { svg, x, y, width } = opts;

  // Parse viewBox
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  if (!vbMatch) return;
  const [vbX, vbY, vbW, vbH] = vbMatch[1].split(/\s+/).map(Number);
  const scale = width / vbW;
  const height = vbH * scale;

  // Parse all path d attributes with their fill
  const groupFillMatch = svg.match(/<g[^>]*fill="([^"]+)"/);
  const defaultFill = groupFillMatch?.[1] ?? '#000000';

  // Draw rects
  const rectRe = /<rect\s+([^>]+)\/>/g;
  let rm;
  while ((rm = rectRe.exec(svg)) !== null) {
    const attrs = rm[1];
    const rx = parseAttr(attrs, 'x');
    const ry = parseAttr(attrs, 'y');
    const rw = parseAttr(attrs, 'width');
    const rh = parseAttr(attrs, 'height');
    const fill = parseStrAttr(attrs, 'fill') ?? defaultFill;
    const color = hexToRgb(fill);

    // Transform: SVG y goes down, PDF y goes up
    const pdfRx = x + (rx - vbX) * scale;
    const pdfRy = y + height - (ry - vbY + rh) * scale;
    const pdfRw = rw * scale;
    const pdfRh = rh * scale;

    page.drawRectangle({
      x: pdfRx, y: pdfRy, width: pdfRw, height: pdfRh, color,
    });
  }

  // Draw paths — use raw PDF path operators
  const pathRe = /<path\s+d="([^"]+)"(?:\s+fill="([^"]+)")?/g;
  let pm;
  while ((pm = pathRe.exec(svg)) !== null) {
    const d = pm[1];
    const fill = pm[2] ?? defaultFill;
    const color = hexToRgb(fill);

    // Parse SVG path commands — our SVGs only use M, L, C, Z (absolute)
    const ops = parseSvgPath(d);
    if (ops.length === 0) continue;

    // Build PDF content stream
    let stream = '';
    stream += `${color.red} ${color.green} ${color.blue} rg\n`;

    for (const op of ops) {
      switch (op.type) {
        case 'M': {
          const [px, py] = transformPoint(op.x, op.y, vbX, vbY, scale, x, y, height);
          stream += `${fmt(px)} ${fmt(py)} m\n`;
          break;
        }
        case 'L': {
          const [px, py] = transformPoint(op.x, op.y, vbX, vbY, scale, x, y, height);
          stream += `${fmt(px)} ${fmt(py)} l\n`;
          break;
        }
        case 'C': {
          const [x1, y1] = transformPoint(op.x1, op.y1, vbX, vbY, scale, x, y, height);
          const [x2, y2] = transformPoint(op.x2, op.y2, vbX, vbY, scale, x, y, height);
          const [px, py] = transformPoint(op.x, op.y, vbX, vbY, scale, x, y, height);
          stream += `${fmt(x1)} ${fmt(y1)} ${fmt(x2)} ${fmt(y2)} ${fmt(px)} ${fmt(py)} c\n`;
          break;
        }
        case 'Z':
          stream += 'h\n';
          break;
      }
    }
    stream += 'f\n'; // fill

    page.pushOperators(
      ...page.doc.context.obj(stream)
        ? [] : [],
    );
    // Use drawSvgPath via content stream
    const ref = page.doc.context.register(
      page.doc.context.stream(stream),
    );
    page.node.addContentStream(ref);
  }
}

function transformPoint(
  svgX: number, svgY: number,
  vbX: number, vbY: number,
  scale: number,
  offsetX: number, offsetY: number, height: number,
): [number, number] {
  return [
    offsetX + (svgX - vbX) * scale,
    offsetY + height - (svgY - vbY) * scale,
  ];
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const h = hex.replace('#', '');
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );
}

function parseAttr(attrs: string, name: string): number {
  const m = attrs.match(new RegExp(`${name}="([^"]+)"`));
  return m ? parseFloat(m[1]) : 0;
}

function parseStrAttr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`${name}="([^"]+)"`));
  return m ? m[1] : null;
}

type PathOp =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Z' };

function parseSvgPath(d: string): PathOp[] {
  const ops: PathOp[] = [];
  // Tokenise: split on command letters, keeping numbers
  const tokens = d.match(/[MmLlCcZzHhVvSsQqTtAa]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g);
  if (!tokens) return ops;

  let i = 0;
  let cmd = '';
  let curX = 0, curY = 0;

  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i++;
    }

    switch (cmd) {
      case 'M':
        curX = num(); curY = num();
        ops.push({ type: 'M', x: curX, y: curY });
        cmd = 'L'; // implicit lineto after moveto
        break;
      case 'L':
        curX = num(); curY = num();
        ops.push({ type: 'L', x: curX, y: curY });
        break;
      case 'H':
        curX = num();
        ops.push({ type: 'L', x: curX, y: curY });
        break;
      case 'V':
        curY = num();
        ops.push({ type: 'L', x: curX, y: curY });
        break;
      case 'C': {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num();
        curX = num(); curY = num();
        ops.push({ type: 'C', x1, y1, x2, y2, x: curX, y: curY });
        break;
      }
      case 'Z':
      case 'z':
        ops.push({ type: 'Z' });
        break;
      default:
        // Skip unsupported commands
        i++;
        break;
    }
  }
  return ops;
}
