/**
 * Read filled shapes back out of a PDF made by pdf-lib, in mm with the origin at the top-left
 * of the page (same frame as the SVG). Used by tests to compare what a PDF actually paints
 * with what the pattern renderer says should be there. Not shipped to the browser.
 */
import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream, type PDFPage } from 'pdf-lib';

export interface PaintedShape {
  /** Bounding box in mm, y down from the top of the page. */
  x0: number; y0: number; x1: number; y1: number;
  /** Fill color, 0–1 per channel. */
  rgb: [number, number, number];
  /** True when the path has curves (a circle), false for straight-edged paths (a rectangle). */
  curved: boolean;
  /** Clip rectangle in force when it was painted (mm), if any. */
  clip?: { x0: number; y0: number; x1: number; y1: number };
}

type M = [number, number, number, number, number, number];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function pageContent(page: PDFPage): string {
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray().map((ref) => page.doc.context.lookup(ref)) : [contents];
  return streams.map((s) => new TextDecoder('latin1').decode(decodePDFRawStream(s as PDFRawStream).decode())).join('\n');
}

/** Every filled path on a page, in paint order. Text is not included. */
export async function paintedShapes(bytes: Uint8Array, pageIndex = 0): Promise<PaintedShape[]> {
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(pageIndex);
  const MM = 25.4 / 72;
  const H = page.getHeight();
  const toBox = (pts: [number, number][]) => {
    const xs = pts.map((p) => p[0] * MM), ys = pts.map((p) => (H - p[1]) * MM);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  };
  const tokens = pageContent(page).replace(/\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>/g, ' str ').split(/\s+/).filter(Boolean);
  const out: PaintedShape[] = [];
  type State = { ctm: M; rgb: [number, number, number]; clip?: PaintedShape['clip'] };
  let st: State = { ctm: [1, 0, 0, 1, 0, 0], rgb: [0, 0, 0] };
  const stack: State[] = [];
  let args: number[] = [];
  let pts: [number, number][] = [];
  let curved = false;
  let pendingClip = false;
  for (const t of tokens) {
    const n = Number(t);
    if (t !== 'str' && Number.isFinite(n)) { args.push(n); continue; }
    switch (t) {
      case 'q': stack.push({ ...st }); break;
      case 'Q': st = stack.pop() ?? st; break;
      case 'cm': st = { ...st, ctm: mul(args.slice(-6) as M, st.ctm) }; break;
      case 'rg': st = { ...st, rgb: args.slice(-3) as [number, number, number] }; break;
      case 'g': st = { ...st, rgb: [args[args.length - 1], args[args.length - 1], args[args.length - 1]] }; break;
      case 'm': case 'l': pts.push(apply(st.ctm, args[args.length - 2], args[args.length - 1])); break;
      case 'c': { const a = args.slice(-6); curved = true; for (let i = 0; i < 6; i += 2) pts.push(apply(st.ctm, a[i], a[i + 1])); break; }
      case 're': { const [x, y, w, h] = args.slice(-4); pts.push(apply(st.ctm, x, y), apply(st.ctm, x + w, y), apply(st.ctm, x + w, y + h), apply(st.ctm, x, y + h)); break; }
      case 'W': case 'W*': pendingClip = true; break;
      case 'n': if (pendingClip && pts.length) st = { ...st, clip: toBox(pts) }; pts = []; curved = false; pendingClip = false; break;
      case 'f': case 'f*': case 'F': case 'B': case 'B*': case 'b': case 'b*':
        if (pts.length) out.push({ ...toBox(pts), rgb: st.rgb, curved, ...(st.clip ? { clip: st.clip } : {}) });
        pts = []; curved = false; break;
      case 'S': case 's': pts = []; curved = false; break;
      default: break;
    }
    args = [];
  }
  return out;
}
