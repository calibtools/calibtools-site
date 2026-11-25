/**
 * What a saved pattern is, in words and numbers, for the read-only pattern page (/pattern/).
 * Everything is read from the spec and from the shapes the generator draws; nothing is typed in.
 */
import type { PatternSpec } from './patterns';
import { patternShapes, shapeBox } from './patternShapes';
import { patternId } from './patternLink';
import { markerIds, formatIds } from './idRange';
import { finderMarkerCells } from './renderCheckerboard';
import { sheetSource, sheetMarkerSize } from './renderMarkerSheet';

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
      if (finderMarkerCells(spec)) rows.push(['Finder markers', 'Yes']);
      if (spec.radonCheckers) rows.push(['Radon checkerboard', 'Rounded outline']);
      break;
    case 'ChArUco': {
      const ids = markerIds(spec) ?? [];
      const n = ids.length;
      rows.push(['Squares (columns × rows)', grid], ['Square size', `${fmt(spec.square)} mm`], ['Marker size', `${fmt(spec.marker)} mm`], ['Dictionary', spec.dict],
        ['Marker IDs', `${ids[0]} to ${ids[n - 1]} (${n} markers)`], ['Inner corners', `${spec.cols - 1} × ${spec.rows - 1} = ${(spec.cols - 1) * (spec.rows - 1)}`]);
      if (spec.legacyLayout) rows.push(['Layout', 'Legacy (OpenCV 4.5 and earlier)']);
      break;
    }
    case 'ArUco grid':
      rows.push(['Markers (columns × rows)', grid], ['Marker size', `${fmt(spec.marker)} mm`], ['Dictionary', spec.dict], ['Marker IDs', formatIds(markerIds(spec) ?? [])]);
      break;
    case 'Marker sheet': {
      const source = sheetSource(spec);
      rows.push(['Markers (columns × rows)', grid], ['Marker size', `${fmt(sheetMarkerSize(spec))} mm`], ['Dictionary', source.name]);
      if (source.borderBits === 2) rows.push(['Border', '2 bits']);
      rows.push(['Marker IDs', formatIds(markerIds(spec) ?? [])]);
      break;
    }
    case 'AprilGrid (Kalibr)':
      rows.push(['Tags (columns × rows)', grid], ['Tag size', `${fmt(spec.square)} mm`], ['Tag family', spec.aprilFamily ?? '36h11'], ['Border', `${spec.borderBits ?? 2} bits`],
        ['Tag spacing', `${fmt(spec.tagSpacing ?? 0.3)} × tag size`], ['Tag IDs', formatIds(markerIds(spec) ?? [])]);
      break;
    default: {
      const sx = spec.circleSpacingX ?? spec.square, sy = spec.circleSpacingY ?? spec.square;
      rows.push(['Grid (columns × rows)', grid], ['Spacing', sx === sy ? `${fmt(sx)} mm` : `${fmt(sx)} × ${fmt(sy)} mm`]);
      if (spec.type !== 'PuzzleBoard') rows.push(['Circle diameter', `${fmt(spec.circleDiameter ?? spec.square * 0.56)} mm`]);
      if (spec.invert) rows.push(['Colors', 'Inverted']);
    }
  }
  rows.push(['Pattern field', `${fmt(w)} × ${fmt(h)} mm`]);
  return rows;
}

/** What a detector finds on the pattern, counted from the pattern itself: "54 corners · 35 markers", "36 tags", "44 circles". */
export function featureCounts(spec: PatternSpec): string {
  const corners = (spec.rows - 1) * (spec.cols - 1);
  const n = markerIds(spec)?.length ?? 0;
  const plural = (count: number, one: string) => `${count} ${count === 1 ? one : one + 's'}`;
  switch (spec.type) {
    case 'ChArUco': return `${plural(corners, 'corner')} · ${plural(n, 'marker')}`;
    case 'ArUco grid':
    case 'Marker sheet': return plural(n, 'marker');
    case 'AprilGrid (Kalibr)': return plural(n, 'tag');
    case 'Symmetric circles': return plural(spec.rows * spec.cols, 'circle');
    case 'HALCON-style dots': return plural(spec.rows * spec.cols, 'dot');
    case 'Asymmetric circles': {
      // Every other position of the lattice holds a circle, as renderCirclesSvg draws them.
      let count = 0;
      for (let r = 0; r < spec.rows; r++) for (let c = 0; c < spec.cols; c++) if ((r + c) % 2 === 0) count++;
      return plural(count, 'circle');
    }
    default: return plural(corners, 'corner');
  }
}
