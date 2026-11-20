/**
 * What a saved pattern is, in words and numbers, for the read-only pattern page (/pattern/).
 * Everything is read from the spec and from the shapes the generator draws; nothing is typed in.
 */
import type { PatternSpec } from './patterns';
import { patternShapes, shapeBox } from './patternShapes';
import { patternId } from './patternLink';

const fmt = (v: number) => String(Math.round(v * 100) / 100);

/** Size of the printed pattern in mm (ink only, no margins). */
export function patternFieldSize(spec: PatternSpec): { w: number; h: number } {
  const boxes = patternShapes({ ...spec, scaleBar: false }).filter((s) => s.kind !== 'text').map(shapeBox);
  const w = Math.max(...boxes.map((b) => b.x1)) - Math.min(...boxes.map((b) => b.x0));
  const h = Math.max(...boxes.map((b) => b.y1)) - Math.min(...boxes.map((b) => b.y0));
  return { w, h };
}

/** Label/value rows describing the pattern, in reading order. */
export function patternFacts(spec: PatternSpec): [string, string][] {
  const rows: [string, string][] = [['Pattern ID', patternId(spec)], ['Type', spec.type]];
  const { w, h } = patternFieldSize(spec);
  const grid = `${spec.cols} × ${spec.rows}`;
  switch (spec.type) {
    case 'Checkerboard':
      rows.push(['Squares (columns × rows)', grid], ['Square size', `${fmt(spec.square)} mm`], ['Inner corners', `${spec.cols - 1} × ${spec.rows - 1} = ${(spec.cols - 1) * (spec.rows - 1)}`]);
      if (spec.invert) rows.push(['Colors', 'Inverted']);
      if (spec.finderMarkers) rows.push(['Finder markers', 'Yes']);
      if (spec.radonCheckers) rows.push(['Radon checkers', 'Yes']);
      break;
    case 'ChArUco': {
      const n = Math.floor((spec.rows * spec.cols) / 2);
      rows.push(['Squares (columns × rows)', grid], ['Square size', `${fmt(spec.square)} mm`], ['Marker size', `${fmt(spec.marker)} mm`], ['Dictionary', spec.dict],
        ['Marker IDs', `${spec.startId} to ${spec.startId + n - 1} (${n} markers)`], ['Inner corners', `${spec.cols - 1} × ${spec.rows - 1} = ${(spec.cols - 1) * (spec.rows - 1)}`]);
      if (spec.legacyLayout) rows.push(['Layout', 'Legacy (OpenCV 4.5 and earlier)']);
      break;
    }
    case 'ArUco grid':
    case 'Marker sheet':
      rows.push(['Markers (columns × rows)', grid], ['Marker size', `${fmt(spec.marker)} mm`], ['Dictionary', spec.dict], ['First marker ID', String(spec.startId)]);
      break;
    case 'AprilGrid (Kalibr)':
      rows.push(['Tags (columns × rows)', grid], ['Tag size', `${fmt(spec.square)} mm`], ['Tag family', spec.aprilFamily ?? '36h11'], ['Tag spacing', `${fmt(spec.tagSpacing ?? 0.3)} × tag size`],
        ['Tag IDs', spec.tagIdList ? spec.tagIdList : `from ${spec.startId}`]);
      break;
    default:
      rows.push(['Grid (columns × rows)', grid], ['Spacing', `${fmt(spec.square)} mm`]);
      if (spec.circleDiameter) rows.push(['Circle diameter', `${fmt(spec.circleDiameter)} mm`]);
  }
  rows.push(['Pattern field', `${fmt(w)} × ${fmt(h)} mm`]);
  return rows;
}
