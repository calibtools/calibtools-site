/**
 * The 100 mm scale bar printed on a board, next to the label line.
 *
 * The label line (brand, part number, pattern summary, batch number) sits in the margin under the pattern.
 * On the small boards that line leaves no room for another 100 mm, so the bar has the margin above the
 * pattern to itself: same left edge as the pattern, centered in the margin, with its length written after it.
 * A ruler laid on the bar checks the print scale without touching the pattern.
 */

/** Length of the bar, mm. */
export const SCALE_BAR_MM = 100;

export interface FactoryBoard {
  boardW: number;
  boardH: number;
  /** Left and top margin of the pattern on the board, mm. */
  ox: number;
  oy: number;
}

export interface FactoryScaleBar {
  x: number;
  y: number;
  width: number;
  height: number;
  caption: { text: string; x: number; baseline: number; size: number };
}

export function factoryScaleBar({ boardH, ox, oy }: FactoryBoard): FactoryScaleBar {
  const cap = 0.01 * boardH; // the label line's cap height
  const size = 0.86 * cap; // and its type size
  const height = Math.min(1.2, Math.max(0.5, 0.2 * cap));
  const mid = oy / 2;
  return {
    x: ox,
    y: mid - height / 2,
    width: SCALE_BAR_MM,
    height,
    caption: { text: `${SCALE_BAR_MM} mm`, x: ox + SCALE_BAR_MM + size * 1.8, baseline: mid + cap * 0.35, size },
  };
}

const n = (v: number) => String(Math.round(v * 1000) / 1000);

/** The bar itself as SVG; the caption is outlined by the caller, which has the font. */
export function factoryScaleBarRect(bar: FactoryScaleBar): string {
  return `<rect id="scale-bar" x="${n(bar.x)}" y="${n(bar.y)}" width="${n(bar.width)}" height="${n(bar.height)}" fill="#000000"/>`;
}
