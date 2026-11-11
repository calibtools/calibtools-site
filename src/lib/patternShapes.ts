/**
 * The pattern as a flat list of shapes in mm, read from the same renderer output the SVG uses.
 * PDF and DXF export draw this list and nothing else, so no format has its own copy of the geometry.
 */
import { renderPatternSvg, type PatternSpec } from './patterns';

export interface RectShape { kind: 'rect'; x: number; y: number; w: number; h: number; fill: string }
export interface CircleShape { kind: 'circle'; cx: number; cy: number; r: number; fill: string }
/** A printed label (tag or marker ID). x is the anchor point, y the baseline. */
export interface TextShape { kind: 'text'; x: number; y: number; size: number; text: string; anchor: 'start' | 'middle' | 'end'; fill: string }
export type Shape = RectShape | CircleShape | TextShape;

const ELEMENT = /<([a-zA-Z]+)\b([^>]*?)(\/>|>([^<]*)<\/\1>)/g;

function attrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function num(a: Record<string, string>, key: string, tag: string): number {
  const v = Number(a[key]);
  if (!Number.isFinite(v)) throw new Error(`patternShapes: <${tag}> has no usable ${key}`);
  return v;
}

/** Shapes of the pattern with its top-left corner at (ox, oy) mm, in drawing order (later shapes paint over earlier ones). */
export function patternShapes(spec: PatternSpec, ox = 0, oy = 0): Shape[] {
  const svg = renderPatternSvg(spec, ox, oy);
  const shapes: Shape[] = [];
  let covered = 0;
  for (const m of svg.matchAll(ELEMENT)) {
    const [whole, tag, rawAttrs, , body] = m;
    covered += whole.length;
    const a = attrs(rawAttrs);
    const fill = a.fill ?? '#000';
    if (tag === 'rect') shapes.push({ kind: 'rect', x: num(a, 'x', tag), y: num(a, 'y', tag), w: num(a, 'width', tag), h: num(a, 'height', tag), fill });
    else if (tag === 'circle') shapes.push({ kind: 'circle', cx: num(a, 'cx', tag), cy: num(a, 'cy', tag), r: num(a, 'r', tag), fill });
    else if (tag === 'text') {
      const anchor = a['text-anchor'] === 'middle' || a['text-anchor'] === 'end' ? a['text-anchor'] : 'start';
      shapes.push({ kind: 'text', x: num(a, 'x', tag), y: num(a, 'y', tag), size: num(a, 'font-size', tag), text: body ?? '', anchor, fill });
    } else throw new Error(`patternShapes: <${tag}> is not a shape PDF and DXF export can draw`);
  }
  // Anything the pattern renderer emits has to be accounted for, or an export would silently drop it.
  if (covered !== svg.length) throw new Error('patternShapes: renderer output contains markup that was not read');
  return shapes;
}

/** '#000' / '#1a2b3c' → [r, g, b] in 0–1. */
export function fillRgb(fill: string): [number, number, number] {
  const h = fill.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`patternShapes: unsupported fill ${fill}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** Bounding box of one shape in mm (text: a generous box around the label). */
export function shapeBox(s: Shape): { x0: number; y0: number; x1: number; y1: number } {
  if (s.kind === 'rect') return { x0: s.x, y0: s.y, x1: s.x + s.w, y1: s.y + s.h };
  if (s.kind === 'circle') return { x0: s.cx - s.r, y0: s.cy - s.r, x1: s.cx + s.r, y1: s.cy + s.r };
  const w = s.text.length * s.size;
  return { x0: s.x - w, y0: s.y - s.size, x1: s.x + w, y1: s.y + s.size * 0.4 };
}
