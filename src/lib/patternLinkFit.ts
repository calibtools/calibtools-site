/**
 * Paper checks for generator links we hand out (quotations, account page). Kept apart from
 * patternLink.ts so code that only parses links does not pull in the pattern renderer.
 */
import { specFromLink } from './patternLink';
import { patternShapes, shapeBox } from './patternShapes';
import { PAPERS, patternFits } from './pageLayout';

/**
 * Smallest listed paper on which the pattern of a generator link prints at 100 %, in either
 * orientation; null when none is large enough. A link whose own paper is too small opens the
 * generator on a cropped preview with a "does not fit" notice, so links we hand out use this.
 */
export function smallestFittingPaper(link: string): string | null {
  const spec = specFromLink(link);
  if (!spec) return null;
  const shapes = patternShapes({ ...spec, scaleBar: false });
  const boxes = shapes.map(shapeBox);
  const bw = Math.max(...boxes.map((b) => b.x1)) - Math.min(...boxes.map((b) => b.x0));
  const bh = Math.max(...boxes.map((b) => b.y1)) - Math.min(...boxes.map((b) => b.y0));
  const byArea = Object.entries(PAPERS).sort(([, a], [, b]) => a[0] * a[1] - b[0] * b[1]);
  for (const [name, [w, h]] of byArea) {
    if (patternFits(bw, bh, w, h, spec.square) || patternFits(bw, bh, h, w, spec.square)) return name;
  }
  return null;
}

/** True when the link's own paper is large enough for its pattern. */
export function linkFitsItsPaper(link: string): boolean {
  const spec = specFromLink(link);
  const fit = smallestFittingPaper(link);
  if (!spec || !fit) return false;
  const area = (n: string) => (PAPERS[n] ? PAPERS[n][0] * PAPERS[n][1] : 0);
  return area(spec.paper) >= area(fit);
}
