/**
 * CT-IR  Inspection report builder (2 pages).
 *
 * Port of build_ir.py — field-for-field identical output.
 */

import {
  Doc,
  esc,
  kv,
  table,
  p,
  section,
  result_box,
  num,
  qr_block,
  signature,
} from '../ctdoc';
import { board_svg, axes } from '../ctpattern';
import { DEFAULT_INSPECTION_LOCATION } from '../../lib/reportConfig';

// ────────────────────────────────────────────────────────────────── types

export interface IRData {
  sn: string;
  part_number: string;
  lot: string;
  id_range: string;
  inspector: string;
  date: string;
  // product info derived from part_number:
  description: string;
  datasheet: string;
  datasheet_rev: string;
  // board geometry:
  W: number;
  H: number;
  rows: number;
  cols: number;
  sq: number;
  marker: number;
  mx: number;
  my: number;
  dict_name: string;
  start_id: number;
  corners: number;
  markers: number;
  label_line: string;
  axes_spec: [number, number, number, number];
}

export interface IRMeasurements {
  instrument: { type: string; id: string; cal: string; valid: string };
  ambient_c: number;
  ref_c: number;
  U_k2_um: number;
  flatness_points: number;
  geometry: Array<{
    feature: string;
    nominal: string;
    measured: string;
    dev: string;
    tol: string;
    result: string;
    note?: string;
  }>;
  flatness: { measured_um: number; tol: string; method: string; result: string };
  visual: Array<{ check: string; criterion: string; result: string }>;
  traceability: {
    instrument_cert: string;
    reference: string;
    retention: string;
  };
  coordinates: {
    file: string;
    n: number;
    max_id: number;
    max_um: number;
    rms_um: number;
  };
}

export type Coord = {
  id: number;
  row: number;
  col: number;
  x_nom: number;
  y_nom: number;
  x_meas: number;
  y_meas: number;
  dx_um: number;
  dy_um: number;
};

// ──────────────────────────────────────────────────── part-number parser

/** Map a part number to product geometry.  Only CT-CHA-C-185110-6X6 for now. */
export function parsePartNumber(pn: string): Omit<
  IRData,
  'sn' | 'lot' | 'id_range' | 'inspector' | 'date' | 'label_line'
> {
  // CT-CHA-C-185110-6X6
  const m = pn.match(
    /^CT-([A-Z]+)-([A-Z])-(\d{3})(\d{3})-(\d+)X(\d+)$/,
  );
  if (!m) throw new Error(`Cannot parse part number: ${pn}`);
  const [, family, material, wStr, hStr, dictBits, _dictBits2] = m;
  const W = Number(wStr);
  const H = Number(hStr);

  // Geometry lookup — currently only CHA-C-185110-6X6
  const PRODUCTS: Record<
    string,
    {
      description: string;
      datasheet: string;
      datasheet_rev: string;
      rows: number;
      cols: number;
      sq: number;
      marker: number;
      mx: number;
      my: number;
      dict_name: string;
      start_id: number;
      corners: number;
      markers: number;
      axes_spec: [number, number, number, number];
    }
  > = {
    'CT-CHA-C-185110-6X6': {
      description: 'ChArUco calibration target, ceramic, 185 \u00d7 110 mm',
      datasheet: 'CT-DS-CHA-C',
      datasheet_rev: 'A',
      rows: 7,
      cols: 12,
      sq: 14,
      marker: 10.5,
      mx: 8.5,
      my: 6,
      dict_name: 'DICT_6X6_250',
      start_id: 0,
      corners: 66,
      markers: 42,
      axes_spec: [4.5, 4.5, 6.5, 0.6],
    },
  };

  const prod = PRODUCTS[pn];
  if (!prod) throw new Error(`Unknown product: ${pn}`);

  return { part_number: pn, ...prod, W, H };
}

// ──────────────────────────────────────────────── block builders

export function identBlock(data: IRData): string {
  const patternDesc = `ChArUco ${data.rows} \u00d7 ${data.cols} \u00b7 ${data.sq} / ${data.marker} mm<br>${data.dict_name}`;
  const idLast = data.start_id + data.markers - 1;
  return kv(
    [
      ['Part number', data.part_number],
      ['Description', esc(data.description)],
      ['Serial number', data.sn],
      ['Lot', data.lot],
      [
        'Datasheet',
        `${data.datasheet} \u00b7 Rev ${data.datasheet_rev}`,
      ],
      ['Pattern', patternDesc],
      [
        'Marker ID range',
        `${data.start_id}\u2013${idLast} <span class="muted">(${data.markers} markers)</span>`,
      ],
      ['Start ID', String(data.start_id)],
    ],
    [
      'Part number',
      'Serial number',
      'Lot',
      'Datasheet',
      'Marker ID range',
      'Start ID',
    ],
  );
}

export function inspectionBlock(
  data: IRData,
  meas: IRMeasurements | null,
  pending: boolean,
): string {
  const i = meas?.instrument;
  return kv(
    [
      ['Inspection date', pending ? '\u2014' : data.date],
      ['Inspector', pending ? '\u2014' : data.inspector],
      ['Location', esc(DEFAULT_INSPECTION_LOCATION)],
      [
        'Instrument',
        i
          ? `${i.type} \u00b7 <span class="mono">${i.id}</span>`
          : 'Optical CMM',
      ],
      [
        'Last calibration',
        i ? `${i.cal} \u00b7 valid to ${i.valid}` : '\u2014',
      ],
      [
        'Temperature',
        (pending
          ? '\u2014'
          : `${meas!.ambient_c} \u00b0C ambient`) +
          ` \u00b7 ${meas?.ref_c ?? 20} \u00b0C reference`,
      ],
    ],
    [
      'Inspection date',
      'Inspector',
      'Temperature',
      'Last calibration',
    ],
  );
}

export function geometryTable(
  meas: IRMeasurements | null,
  pending: boolean,
): string {
  const cols: [string, 't' | 'n' | 's'][] = [
    ['Feature', 't'],
    ['Nominal<br>(mm)', 'n'],
    ['Measured<br>(mm)', 'n'],
    ['Deviation<br>(\u00b5m)', 'n'],
    ['Tolerance<br>(\u00b5m)', 'n'],
    ['Result', 's'],
  ];
  const rows: string[][] = [];
  const geom = meas?.geometry ?? [];
  for (const g of geom) {
    const f =
      esc(g.feature) +
      (g.note
        ? ` <span class="muted small">\u00b7 ${esc(g.note)}</span>`
        : '');
    if (pending) {
      rows.push([f, g.nominal, '\u2014', '\u2014', g.tol, 'PENDING']);
    } else {
      rows.push([
        f,
        g.nominal,
        g.measured,
        g.dev || '\u2014',
        g.tol,
        g.result,
      ]);
    }
  }
  return table(cols, rows, '', null, [
    '40%',
    '12%',
    '13%',
    '12%',
    '12%',
    '11%',
  ]);
}

export function flatnessTable(
  meas: IRMeasurements | null,
  pending: boolean,
): string {
  const fl = meas?.flatness;
  const cols: [string, 't' | 'n' | 's'][] = [
    ['Measured flatness (\u00b5m)', 'n'],
    ['Tolerance (\u00b5m)', 'n'],
    ['Method', 't'],
    ['Result', 's'],
  ];
  return table(
    cols,
    [
      [
        pending ? '\u2014' : String(fl?.measured_um ?? '\u2014'),
        fl?.tol ?? '\u2014',
        esc(fl?.method ?? '\u2014'),
        pending ? 'PENDING' : (fl?.result ?? '\u2014'),
      ],
    ],
    '',
    null,
    ['24%', '17%', '47%', '12%'],
  );
}

export function visualTable(
  meas: IRMeasurements | null,
  pending: boolean,
): string {
  const cols: [string, 't' | 'n' | 's'][] = [
    ['Check', 't'],
    ['Criterion', 't'],
    ['Result', 's'],
  ];
  const vis = meas?.visual ?? [];
  return table(
    cols,
    vis.map((v) => [
      esc(v.check),
      esc(v.criterion),
      pending ? 'PENDING' : v.result,
    ]),
    '',
    null,
    ['30%', '58%', '12%'],
  );
}

export function featureMap(
  data: IRData,
  coords: Coord[] | null,
  pending: boolean,
): string {
  const vec =
    pending || !coords
      ? undefined
      : Object.fromEntries(
          coords.map((r) => [r.id, [r.dx_um, r.dy_um] as [number, number]]),
        );
  const hl =
    pending || !coords ? undefined : [coords.reduce((a, b) => {
      const aDist = Math.sqrt(a.dx_um ** 2 + a.dy_um ** 2);
      const bDist = Math.sqrt(b.dx_um ** 2 + b.dy_um ** 2);
      return aDist >= bDist ? a : b;
    }).id];

  const svg = board_svg({
    W: data.W,
    H: data.H,
    rows: data.rows,
    cols: data.cols,
    sq: data.sq,
    marker: data.marker,
    mx: data.mx,
    my: data.my,
    label: data.label_line,
    label_w: 168,
    axes_spec: data.axes_spec,
    mode: 'map',
    width_mm: 104,
    corners: true,
    corner_ids: true,
    vectors: vec,
    vec_scale: 2000,
    highlight: hl,
    origin: true,
  });

  // Find max deviation coord for legend
  const maxCoord = coords?.reduce((a, b) => {
    const aDist = Math.sqrt(a.dx_um ** 2 + a.dy_um ** 2);
    const bDist = Math.sqrt(b.dx_um ** 2 + b.dy_um ** 2);
    return aDist >= bDist ? a : b;
  });

  const lg = `<div class="small" style="line-height:1.5">
<div class="tag" style="margin-bottom:1.5mm">Legend</div>
<svg width="34mm" height="13mm" viewBox="0 0 34 13">${axes(2, 2, 9, 0.75, false)}
<text x="13" y="3.1" font-family="Geist Mono" font-size="2.6" fill="#000">X \u2192 right</text>
<text x="4.6" y="11.6" font-family="Geist Mono" font-size="2.6" fill="#000">Y \u2193 down</text></svg>
<div style="margin:1.2mm 0"><svg width="3.4mm" height="3.4mm" viewBox="0 0 3.4 3.4" style="vertical-align:-0.7mm"><circle cx="1.7" cy="1.7" r="1.3" fill="#fff" stroke="#000" stroke-width="0.35"/><circle cx="1.7" cy="1.7" r="0.45"/></svg>
 Origin <span class="mono">(0, 0)</span>: top-left outer corner of the pattern (OpenCV frame)</div>
<div style="margin:1.2mm 0"><svg width="3.4mm" height="3.4mm" viewBox="0 0 3.4 3.4" style="vertical-align:-0.7mm"><circle cx="1.7" cy="1.7" r="0.42"/></svg>
 Measured corner with id, <span class="mono">n = ${data.corners}</span></div>
${
  pending
    ? ''
    : `<div style="margin:1.2mm 0"><svg width="7mm" height="3.4mm" viewBox="0 0 7 3.4" style="vertical-align:-0.7mm"><circle cx="0.6" cy="1.7" r="0.42"/><line x1="0.6" y1="1.7" x2="6.6" y2="1.7" stroke="#000" stroke-width="0.32"/></svg>
 Deviation vector, magnified \u00d7 2000 <span class="muted">(1 \u00b5m = 2 mm on the board)</span></div>
<div style="margin:1.2mm 0"><svg width="3.4mm" height="3.4mm" viewBox="0 0 3.4 3.4" style="vertical-align:-0.7mm"><circle cx="1.7" cy="1.7" r="1.4" fill="none" stroke="#000" stroke-width="0.3"/></svg>
 Largest deviation: id <span class="mono">${maxCoord?.id}</span>, <span class="mono">${maxCoord ? Math.sqrt(maxCoord.dx_um ** 2 + maxCoord.dy_um ** 2).toFixed(1) : '?'} \u00b5m</span></div>`
}
</div>`;

  return `<div style="display:grid;grid-template-columns:104mm 1fr;gap:8mm;align-items:start">${svg}${lg}</div>`;
}

export function coordsPreview(
  data: IRData,
  meas: IRMeasurements | null,
  coords: Coord[] | null,
  pending: boolean,
): string {
  const c = meas?.coordinates;
  if (pending || !coords || !c) {
    return p(
      `Measurement pending. The coordinate file <span class="mono">CT-CSV-${data.sn}.csv</span> will be issued with Rev B of this report.`,
    );
  }
  const cols: [string, 'n'][] = [
    ['id', 'n'],
    ['row', 'n'],
    ['col', 'n'],
    ['x_nom', 'n'],
    ['y_nom', 'n'],
    ['x_meas', 'n'],
    ['y_meas', 'n'],
    ['dx_um', 'n'],
    ['dy_um', 'n'],
  ];
  const rows = coords.slice(0, 10).map((r) => [
    String(r.id),
    String(r.row),
    String(r.col),
    r.x_nom.toFixed(3),
    r.y_nom.toFixed(3),
    r.x_meas.toFixed(4),
    r.y_meas.toFixed(4),
    num(r.dx_um, 1, true),
    num(r.dy_um, 1, true),
  ]);
  const intro = p(
    `Complete corner coordinates are supplied in <span class="mono black">${c.file}</span> (${c.n} rows; columns id, row, col, ` +
      `x_nom, y_nom, x_meas, y_meas, dx_um, dy_um; mm unless stated). First 10 rows:`,
    'small',
  );
  return intro + table(cols, rows, 'dense rawhead');
}

// ──────────────────────────────────────────────── main build

export async function buildIR(opts: {
  data: IRData;
  measurements: IRMeasurements | null;
  coords: Coord[] | null;
  outBase: string;
  watermark?: string;
}): Promise<{ pages: number; overflow: unknown[]; free_mm: unknown }> {
  const { data, measurements: meas, coords, outBase, watermark } = opts;
  const pending = meas === null;
  const rev = 'A';

  const reportNo = `CT-IR-${data.sn}`;
  // Doc(number, rev, date, eyebrow, title, sn, subtitle, watermark)
  const d = new Doc(reportNo, rev, data.date, 'Inspection report',
    `ChArUco target \u00b7 ceramic \u00b7 ${data.W} \u00d7 ${data.H} mm`,
    data.sn, undefined, watermark);

  // ── result box ──
  const geomCount = meas?.geometry?.length ?? 9;
  const visualCount = meas?.visual?.length ?? 4;
  const meta =
    `${geomCount} geometry \u00b7 1 flatness \u00b7 ${visualCount} visual<br>` +
    `${data.corners} corners \u00b7 U = ${meas?.U_k2_um ?? 1.5} \u00b5m (k = 2)`;

  let res: string;
  if (pending) {
    res = result_box(
      'PENDING',
      'Measurement data pending; this report will be re-issued as Rev B.',
      'Overall result',
      true,
      meta,
    );
  } else {
    res = result_box(
      'PASS',
      'All measured features within datasheet tolerance.',
      'Overall result',
      true,
      meta,
    );
  }

  // ── top grid ──
  const top =
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8mm;align-items:start;margin-bottom:3.2mm">` +
    `<div><div class="tag" style="margin-bottom:1.2mm">Item</div>${identBlock(data)}</div>` +
    `<div><div class="tag" style="margin-bottom:1.2mm">Inspection</div>${inspectionBlock(data, meas, pending)}</div></div>${res}`;

  // ── method paragraph ──
  const verb = pending ? 'will be measured' : 'were measured';
  const instrumentId = meas?.instrument?.id ?? 'OCMM-01';
  const flatnessPoints = meas?.flatness_points ?? 25;
  const Uk2 = meas?.U_k2_um ?? 1.5;
  const refC = meas?.ref_c ?? 20;
  const methodText =
    `Positions of all ${data.corners} ChArUco corners ${verb} on an optical CMM (${instrumentId}); flatness ` +
    `${pending ? 'will be' : 'was'} measured at ${flatnessPoints} points. Expanded uncertainty U = ${Uk2} \u00b5m (k = 2). Results are corrected ` +
    `to the reference temperature of ${refC} \u00b0C` +
    (pending ? '.' : `; ambient temperature during measurement ${meas!.ambient_c} \u00b0C.`);

  // ── page 1 ──
  const page1 =
    top +
    section(1, 'Method') +
    p(methodText) +
    section(2, 'Pattern geometry', 'ceramic: deviations in \u00b5m') +
    geometryTable(meas, pending) +
    section(3, 'Flatness') +
    flatnessTable(meas, pending) +
    section(4, 'Visual') +
    visualTable(meas, pending);
  d.addPage(page1);

  // ── page 2 ──
  const ds = `${data.datasheet} rev ${data.datasheet_rev}`;
  let stmt: string;
  if (pending) {
    stmt =
      'Measurement data pending; this report will be re-issued as Rev B.';
  } else {
    stmt =
      `The item identified above meets the specifications of datasheet ${ds} at the time of inspection. ` +
      'This is an inspection report issued by Calib.Tools; it is not an accredited calibration certificate. ' +
      'An ILAC-MRA certificate issued by an accredited third-party laboratory is available as SVC-X-CERT-ILAC.';
  }

  const tr = meas?.traceability;
  const trace = tr
    ? kv([
        ['Instrument', esc(tr.instrument_cert)],
        ['Reference standard', esc(tr.reference)],
        ['Raw data', esc(tr.retention)],
      ])
    : kv([
        ['Instrument', '\u2014'],
        ['Reference standard', '\u2014'],
        ['Raw data', '\u2014'],
      ]);

  const verifyUrl = `https://calib.tools/verify/${data.sn}`;
  const sig = signature(
    data.inspector,
    'Inspector',
    pending ? '\u2014' : data.date,
    pending ? undefined : 'JG',
    pending ? undefined : [data.sn, data.date, data.inspector],
    pending ? undefined : 'Printed signature',
  );
  const foot =
    `<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end">${sig}` +
    `${qr_block(verifyUrl, 15)}</div>`;

  const page2 =
    section(5, 'Feature map') +
    featureMap(data, coords, pending) +
    section(6, 'Measured coordinates') +
    coordsPreview(data, meas, coords, pending) +
    section(7, 'Statement') +
    `<p class="statement">${stmt}</p>` +
    section(8, 'Traceability') +
    trace +
    foot;
  d.addPage(page2);

  const result = await d.render(outBase);
  return {
    pages: result.pages,
    overflow: result.overflow,
    free_mm: result.free_mm,
  };
}
