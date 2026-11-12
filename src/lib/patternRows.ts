/**
 * The parameters of a pattern as label / value rows, for the "Your pattern" card on the
 * quote page. Only what applies to the pattern type is listed.
 */
import type { PatternSpec } from './patterns';
import { aprilGridTags } from './renderAprilGrid';

const mm = (v: number) => `${Math.round(v * 1000) / 1000} mm`;

export function patternRows(s: PatternSpec): [label: string, value: string][] {
  const rows: [string, string][] = [['Pattern', s.type]];
  const circles = s.type.includes('circles') || s.type.includes('dots');
  if (s.type === 'AprilGrid (Kalibr)') {
    rows.push(['Tags', `${s.rows} × ${s.cols}`], ['Tag size', mm(s.square)], ['Gap', mm(s.square * (s.tagSpacing ?? 0.3))], ['Family', `AprilTag ${s.aprilFamily ?? '36h11'}`]);
    const tags = aprilGridTags(s);
    rows.push(['IDs', `${tags[0].id}–${tags[tags.length - 1].id}`]);
  } else if (circles) {
    rows.push(['Circles', `${s.rows} × ${s.cols}`], ['Spacing', mm(s.circleSpacingX ?? s.square)], ['Diameter', mm(s.circleDiameter ?? s.square * 0.56)]);
  } else if (s.type === 'Marker sheet') {
    rows.push(['Markers', `${s.rows} × ${s.cols}`], ['Marker size', mm(s.marker || s.square)], ['Dictionary', s.dict], ['First ID', String(s.startId)]);
  } else if (s.type === 'ArUco grid') {
    rows.push(['Markers', `${s.rows} × ${s.cols}`], ['Marker size', mm(s.marker)], ['Marker separation', mm(s.square - s.marker)], ['Dictionary', s.dict], ['First ID', String(s.startId)]);
  } else {
    rows.push(['Squares', `${s.rows} × ${s.cols}`], ['Square size', mm(s.square)]);
    if (s.type === 'ChArUco') rows.push(['Marker size', mm(s.marker)], ['Dictionary', s.dict], ['First ID', String(s.startId)]);
  }
  return rows;
}
