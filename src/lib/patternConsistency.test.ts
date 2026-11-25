import { describe, it, expect } from 'vitest';
import { checkerboardSvg, type PatternSpec } from './patterns';
import { patternShapes, type RectShape } from './patternShapes';
import { patternSummary } from './brand';
import { opencvJson, kalibrSupported } from './exportConfig';
import { exportDxf } from './exportDxf';
import { buildReadme } from './exportZip';
import { patternFacts } from './patternFacts';
import { quoteSummary } from './catalogPatterns';
import { markerIds, markerSource, markerCapacity, formatIds, idsAreOneRun } from './idRange';
import { getMarkerDict, decodeMarkerBits } from './dicts/dicts';
import { computeLayout, PAPERS } from './pageLayout';
import { GENERATOR_DEFAULT, specToParams, specFromParams } from './patternLink';
import { buildSetManifest, computeSetBoards } from './exportSet';
import { convert, parse, toSpec } from './convert';
import { kalibrYaml, ros2Yaml, halconCode } from './exportConfig';

/**
 * What a pattern file says and what is drawn on it have to be the same thing.
 *
 * Reported 2026-11-24: an AprilGrid of tag16h5 said "tag36h11" under the board in SVG, PNG and DXF, and the
 * PDF said tag16h5. The check that followed found more of the same kind: a marker sheet that drew DICT_6X6_250
 * while the form showed an AprilTag family, ID lists the label did not follow, markers past the end of a
 * dictionary drawn solid black, a corner radius the PDF and DXF dropped.
 *
 * So for every pattern type, dictionary, tag family and option, this reads the drawing back: each marker's
 * bits are looked up in the dictionary the files name, and the ID found there has to be the ID the files give.
 * Then every place that describes the pattern (label, SVG, DXF, README, opencv.json, facts table, quote line)
 * is held to that reading.
 */

const DICTS = ['DICT_4X4_50', 'DICT_4X4_100', 'DICT_4X4_250', 'DICT_5X5_100', 'DICT_5X5_1000', 'DICT_6X6_250', 'DICT_7X7_1000', 'DICT_ARUCO_ORIGINAL', 'DICT_ARUCO_MIP_36h12', 'DICT_APRILTAG_36h11'];
const FAMILIES = ['16h5', '25h9', '36h11'];
const base: PatternSpec = { ...GENERATOR_DEFAULT, paper: 'A3' };

const cases: [string, PatternSpec][] = [];
const add = (name: string, over: Partial<PatternSpec>) => cases.push([name, { ...base, ...over }]);
for (const dict of DICTS) {
  add(`ChArUco ${dict}`, { type: 'ChArUco', rows: 5, cols: 7, square: 30, marker: 22, dict });
  add(`ArUco grid ${dict}`, { type: 'ArUco grid', rows: 4, cols: 5, square: 40, marker: 30, dict });
  add(`marker sheet ${dict}`, { type: 'Marker sheet', rows: 3, cols: 4, square: 40, marker: 40, dict });
}
for (const aprilFamily of FAMILIES) for (const borderBits of [1, 2]) {
  add(`AprilGrid tag${aprilFamily}, ${borderBits}-bit border`, { type: 'AprilGrid (Kalibr)', rows: 4, cols: 5, square: 40, aprilFamily, borderBits, tagSpacing: 0.3 });
  // The form leaves the ArUco dictionary filled in when a family is chosen; the family is what counts.
  add(`marker sheet tag${aprilFamily}, ${borderBits}-bit border`, { type: 'Marker sheet', rows: 3, cols: 4, square: 40, marker: 40, dict: 'DICT_6X6_250', aprilFamily, borderBits });
}
add('ChArUco, legacy layout, even rows', { type: 'ChArUco', rows: 6, cols: 7, square: 30, marker: 22, legacyLayout: true });
add('ChArUco from ID 17', { type: 'ChArUco', rows: 5, cols: 7, square: 30, marker: 22, startId: 17 });
add('ArUco grid from ID 200', { type: 'ArUco grid', rows: 4, cols: 5, square: 40, marker: 30, startId: 200 });
add('AprilGrid from ID 50', { type: 'AprilGrid (Kalibr)', rows: 3, cols: 4, square: 40, aprilFamily: '36h11', startId: 50 });
add('AprilGrid with an ID list', { type: 'AprilGrid (Kalibr)', rows: 3, cols: 4, square: 40, aprilFamily: '36h11', tagIdList: '10-15,100,200-204' });
add('AprilGrid with corner squares and ID labels', { type: 'AprilGrid (Kalibr)', rows: 3, cols: 4, square: 40, aprilFamily: '36h11', symmetricCorners: true, showTagIds: true, tagSpacing: 0.25 });
add('marker sheet with an ID list', { type: 'Marker sheet', rows: 2, cols: 3, square: 40, marker: 40, tagIdList: '7,9,40-43' });
add('marker sheet, one marker, ID 23', { type: 'Marker sheet', rows: 1, cols: 1, square: 120, marker: 100, startId: 23 });
add('the AprilTag page preset', { type: 'Marker sheet', rows: 1, cols: 1, square: 120, marker: 100, dict: 'DICT_APRILTAG_36h11', aprilFamily: '36h11', borderBits: 1 });

const MARKER_TYPES = ['ChArUco', 'ArUco grid', 'AprilGrid (Kalibr)', 'Marker sheet'];
const isWhite = (fill: string) => /^#f{3}(f{3})?$/i.test(fill);

/** The marker drawn at each position, read from the shapes: which ID of `dictName` has these bits (-1: none, the marker is solid or foreign). */
function readMarkers(spec: PatternSpec, dictName: string, borderBits: number): number[] {
  const dict = getMarkerDict(dictName)!;
  const side = spec.type === 'AprilGrid (Kalibr)' ? spec.square : spec.type === 'Marker sheet' ? (spec.marker || spec.square) : spec.marker;
  const n = dict.markerSize, cell = side / (n + 2 * borderBits);
  const rects = patternShapes({ ...spec, scaleBar: false }).filter((s): s is RectShape => s.kind === 'rect');
  const grounds = rects.filter((s) => !isWhite(s.fill) && Math.abs(s.w - side) < 1e-6 && Math.abs(s.h - side) < 1e-6);
  const known = new Map(dict.bits.map((hex, id) => [decodeMarkerBits(hex, n).map((row) => row.join('')).join('/'), id]));
  return grounds.map((g) => {
    const bits = Array.from({ length: n }, () => Array<number>(n).fill(0));
    for (const w of rects) {
      if (!isWhite(w.fill) || w.x < g.x - 1e-6 || w.y < g.y - 1e-6 || w.x > g.x + side - 1e-6 || w.y > g.y + side - 1e-6) continue;
      expect(Math.abs(w.w - cell), 'a white cell is one bit wide').toBeLessThan(1e-6);
      let bj = Math.round((w.x - g.x) / cell) - borderBits, bi = Math.round((w.y - g.y) / cell) - borderBits;
      // Kalibr prints every tag of an AprilGrid turned by 180 degrees.
      if (spec.type === 'AprilGrid (Kalibr)') { bj = n - 1 - bj; bi = n - 1 - bi; }
      expect(bi >= 0 && bi < n && bj >= 0 && bj < n, 'white cells stay inside the border').toBe(true);
      bits[bi][bj] = 1;
    }
    return known.get(bits.map((row) => row.join('')).join('/')) ?? -1;
  });
}

/** OpenCV dictionary name and border width the files give for the pattern. */
function namedSource(spec: PatternSpec, json: Record<string, any>): { dict: string; border: number } {
  if (spec.type === 'AprilGrid (Kalibr)') return { dict: `DICT_APRILTAG_${String(json.tag_family).replace(/^tag/, '')}`, border: json.border_bits };
  return { dict: json.dictionary, border: json.border_bits ?? 1 };
}

describe.each(cases)('%s', (_name, spec) => {
  const json = JSON.parse(opencvJson(spec));
  const label = patternSummary(spec);
  const ids = markerIds(spec)!;

  it('every marker reads back as the ID the files give, from the dictionary the files name', () => {
    const { dict, border } = namedSource(spec, json);
    const drawn = readMarkers(spec, dict, border);
    // Kalibr numbers from the bottom-left; the renderer draws in ID order either way.
    expect(drawn).toEqual(ids);
    expect(json.ids ?? Array.from({ length: ids.length }, (_, i) => json.start_id + i)).toEqual(ids);
    expect(json.id_range).toEqual([Math.min(...ids), Math.max(...ids)]);
  });

  it('the label names that source and those IDs', () => {
    const source = markerSource(spec)!;
    expect(label).toContain(source.name);
    expect(spec.type === 'AprilGrid (Kalibr)' ? json.tag_family : json.dictionary).toBe(source.name);
    expect(label).toContain(`IDs ${idsAreOneRun(ids) ? `${ids[0]}–${ids[ids.length - 1]}` : formatIds(ids)}`);
    for (const other of [...DICTS, ...FAMILIES.map((f) => `tag${f}`), ...FAMILIES.map((f) => `DICT_APRILTAG_${f}`)]) {
      if (other !== source.name) expect(label, `label names ${other}`).not.toMatch(new RegExp(`${other}(?![0-9])`));
    }
  });

  it('SVG, DXF and README carry the same label', () => {
    const [w, h] = PAPERS[spec.paper];
    const layout = computeLayout(spec, w, h, 'auto');
    expect(checkerboardSvg(spec, layout.pw, layout.ph, layout)).toContain(label);
    expect(exportDxf({ spec, pw: layout.pw, ph: layout.ph, layout })).toContain(label);
    expect(buildReadme({ summary: label, files: [] })).toContain(label);
    expect(json._generator.pattern).toBe(label);
  });

  it('the facts table and the quote line name the same source and IDs', () => {
    const source = markerSource(spec)!;
    const facts = patternFacts(spec).map(([, v]) => v);
    expect(facts.some((v) => v === source.name || `tag${v}` === source.name)).toBe(true);
    expect(facts.some((v) => v === formatIds(ids) || v.startsWith(`${ids[0]} to ${ids[ids.length - 1]} (`))).toBe(true);
    expect(quoteSummary(spec)).toContain(source.name);
  });

  it('a pattern link brings back the same pattern', () => {
    const back = { ...GENERATOR_DEFAULT, ...specFromParams(new URLSearchParams(specToParams(spec).toString())) } as PatternSpec;
    expect(patternSummary(back)).toBe(label);
    expect(JSON.parse(opencvJson(back))).toEqual(json);
  });
});

describe('markers the dictionary or tag family does not have', () => {
  const over: [string, Partial<PatternSpec>, number][] = [
    ['ChArUco 10 × 12 in DICT_4X4_50', { type: 'ChArUco', rows: 10, cols: 12, square: 20, marker: 15, dict: 'DICT_4X4_50' }, 50],
    ['ArUco grid 8 × 8 in DICT_4X4_50', { type: 'ArUco grid', rows: 8, cols: 8, square: 30, marker: 22, dict: 'DICT_4X4_50' }, 50],
    ['AprilGrid 6 × 6 in tag16h5', { type: 'AprilGrid (Kalibr)', rows: 6, cols: 6, square: 20, aprilFamily: '16h5' }, 30],
    ['AprilGrid 6 × 6 in tag25h9', { type: 'AprilGrid (Kalibr)', rows: 6, cols: 6, square: 20, aprilFamily: '25h9' }, 35],
    ['marker sheet 6 × 10 in DICT_4X4_50', { type: 'Marker sheet', rows: 6, cols: 10, square: 20, marker: 20, dict: 'DICT_4X4_50' }, 50],
    ['marker sheet 6 × 6 in tag16h5', { type: 'Marker sheet', rows: 6, cols: 6, square: 20, marker: 20, aprilFamily: '16h5' }, 30],
    ['marker sheet, ID list reaching 60 in DICT_4X4_50', { type: 'Marker sheet', rows: 1, cols: 3, square: 40, marker: 40, dict: 'DICT_4X4_50', tagIdList: '1,2,60' }, 50],
  ];
  it.each(over)('%s: the form is told, so it can turn the downloads off', (_n, o, count) => {
    const spec = { ...base, ...o } as PatternSpec;
    const cap = markerCapacity(spec)!;
    expect(cap).toMatchObject({ count, short: true });
    // what would be printed: the markers past the end are solid black
    const json = JSON.parse(opencvJson(spec));
    const { dict, border } = namedSource(spec, json);
    const drawn = readMarkers(spec, dict, border);
    expect(drawn.filter((id) => id === -1)).toHaveLength(markerIds(spec)!.filter((id) => id >= count).length);
  });

  it.each(cases)('%s fits, and nothing on it is solid', (_n, spec) => {
    expect(markerCapacity(spec)).toMatchObject({ short: false });
  });

  it('every pattern type with markers has a capacity check', () => {
    for (const type of MARKER_TYPES) expect(markerCapacity({ ...base, type: type as PatternSpec['type'], rows: 3, cols: 4 })).not.toBeNull();
  });
});

describe('patterns without markers say what is drawn', () => {
  it('a circle grid with its own X and Y spacing gives both, everywhere', () => {
    const spec: PatternSpec = { ...base, type: 'Symmetric circles', rows: 7, cols: 10, square: 25, circleSpacingX: 30, circleSpacingY: 20, circleDiameter: 12 };
    const centers = patternShapes({ ...spec, scaleBar: false }).filter((s) => s.kind === 'circle');
    const dx = centers[1].kind === 'circle' && centers[0].kind === 'circle' ? centers[1].cx - centers[0].cx : 0;
    const dy = centers[10].kind === 'circle' && centers[0].kind === 'circle' ? centers[10].cy - centers[0].cy : 0;
    expect([dx, dy]).toEqual([30, 20]);
    expect(patternSummary(spec)).toBe('Symmetric circles 7×10 · 30 × 20 mm spacing');
    expect(quoteSummary(spec)).toContain('30 × 20 mm pitch');
    expect(patternFacts(spec)).toContainEqual(['Spacing', '30 × 20 mm']);
    const json = JSON.parse(opencvJson(spec));
    expect([json.square_mm, json.spacing_y_mm, json.circle_diameter_mm]).toEqual([30, 20, 12]);
  });

  it('no pattern type without markers gets a dictionary, a marker size or IDs in its files', () => {
    for (const type of ['Checkerboard', 'Symmetric circles', 'Asymmetric circles', 'HALCON-style dots'] as const) {
      const spec: PatternSpec = { ...base, type, rows: 8, cols: 10, square: 20 };
      const json = JSON.parse(opencvJson(spec));
      for (const k of ['dictionary', 'marker_mm', 'start_id', 'id_range', 'ids', 'tag_family']) expect(json[k], `${type}: ${k}`).toBeUndefined();
      expect(patternSummary(spec)).not.toMatch(/DICT_|IDs|tag\d/);
    }
  });
});

describe('Kalibr file only for a grid Kalibr can read', () => {
  const grid: PatternSpec = { ...base, type: 'AprilGrid (Kalibr)', rows: 4, cols: 5, square: 30, aprilFamily: '36h11', borderBits: 2 };
  it('tag36h11, two-bit border, IDs from 0', () => expect(kalibrSupported(grid)).toBe(true));
  // Kalibr places a tag by its ID and drops every ID from rows x cols upward (GridCalibrationTargetAprilgrid.cpp).
  it.each([
    ['another family', { aprilFamily: '16h5' }], ['a one-bit border', { borderBits: 1 }],
    ['a start ID other than 0', { startId: 20 }], ['an ID list', { tagIdList: '0-9,30-39' }],
  ] as [string, Partial<PatternSpec>][])('not with %s', (_n, o) => expect(kalibrSupported({ ...grid, ...o })).toBe(false));
});

describe('a set of boards', () => {
  it('an AprilGrid set lists tag family, tag size and border, not an ArUco dictionary', () => {
    const spec: PatternSpec = { ...base, type: 'AprilGrid (Kalibr)', rows: 3, cols: 4, square: 30, aprilFamily: '25h9', borderBits: 1, dict: 'DICT_6X6_250' };
    const m = JSON.parse(buildSetManifest(spec, computeSetBoards(spec, 2)));
    expect(m).toMatchObject({ tag_family: 'tag25h9', tag_size_mm: 30, border_bits: 1 });
    expect(m.dictionary).toBeUndefined();
    expect(m.boards.map((b: any) => b.id_range)).toEqual([[0, 11], [12, 23]]);
  });

  it('boards are numbered one after the other even when an ID list is typed in', () => {
    const spec: PatternSpec = { ...base, type: 'AprilGrid (Kalibr)', rows: 2, cols: 2, square: 30, tagIdList: '5,9,11,20' };
    expect(computeSetBoards(spec, 3).map((b) => markerIds(b.spec))).toEqual([[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]]);
  });
});

describe('the format converter writes what the generator writes', () => {
  const plain: [string, PatternSpec][] = [
    ['checkerboard', { ...base, type: 'Checkerboard', rows: 7, cols: 10, square: 25 }],
    ['checkerboard, inverted', { ...base, type: 'Checkerboard', rows: 7, cols: 10, square: 25, invert: true }],
    ['radon checkerboard with finder markers', { ...base, type: 'Checkerboard', rows: 8, cols: 11, square: 25, radonCheckers: true, finderMarkers: true }],
    ['symmetric circles', { ...base, type: 'Symmetric circles', rows: 7, cols: 10, square: 25 }],
    ['symmetric circles, own X and Y spacing', { ...base, type: 'Symmetric circles', rows: 7, cols: 10, square: 25, circleSpacingX: 30, circleSpacingY: 20, circleDiameter: 12 }],
    ['asymmetric circles, inverted', { ...base, type: 'Asymmetric circles', rows: 11, cols: 8, square: 18, invert: true }],
    ['HALCON-style dots', { ...base, type: 'HALCON-style dots', rows: 7, cols: 7, square: 25 }],
  ];
  const outcome = (f: () => string) => { try { return f().split('\n').filter((l) => !/Generated with/.test(l)).join('\n'); } catch (e) { return `refused: ${(e as Error).message}`; } };

  describe.each([...cases, ...plain])('%s', (_n, spec) => {
    const ours = opencvJson(spec);

    it('reads our opencv.json as the same pattern', () => {
      expect(JSON.parse(opencvJson({ ...toSpec(parse(ours)), paper: spec.paper }))).toEqual(JSON.parse(ours));
    });

    it.each([
      ['Kalibr', 'kalibr-yaml', kalibrYaml], ['ROS 2', 'ros2-yaml', ros2Yaml], ['HALCON', 'halcon-hdev', halconCode],
    ] as const)('%s: the same file as the generator, or the same refusal', (_t, format, direct) => {
      expect(outcome(() => convert(ours, format))).toBe(outcome(() => direct(spec)));
    });
  });

  it('a tag16h5 AprilGrid is not turned into a Kalibr file', () => {
    const spec: PatternSpec = { ...base, type: 'AprilGrid (Kalibr)', rows: 5, cols: 6, square: 20, aprilFamily: '16h5' };
    expect(() => convert(opencvJson(spec), 'kalibr-yaml')).toThrow('Kalibr reads tag36h11 only; this grid is tag16h5.');
  });

  it('a marker sheet stays a marker sheet', () => {
    const spec: PatternSpec = { ...base, type: 'Marker sheet', rows: 2, cols: 3, square: 40, marker: 40, dict: 'DICT_5X5_100' };
    expect(parse(opencvJson(spec)).type).toBe('Marker sheet');
    expect(() => convert(opencvJson(spec), 'ros2-yaml')).toThrow('ROS camera_calibration has no pattern for Marker sheet');
  });
});
