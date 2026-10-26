/**
 * CT-DS  Datasheet builder — all product families + services.
 *
 * Reads markdown front matter + tables from docs/datasheets/*.md,
 * merges with ctdoc components and ctpattern renderings.
 *
 * Port of build_ds.py — CHA-C layout is field-for-field faithful;
 * other datasheets use the same structure with content from their markdown.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Doc,
  section,
  p,
  table,
  kv,
  qr_block,
  type RenderResult,
  type ColumnKind,
} from '../ctdoc';
import { board_svg, axes, dim_h, dim_v } from '../ctpattern';
import { LEAD_TIME } from '../../lib/claims';

// ── Front-matter parser ──────────────────────────────────────────────

export interface DSFrontMatter {
  code: string;
  title: string;
  type: string;
  rev: string;
  date: string;
  status: string;
  family: string;
  material: string;
}

export interface DSParsed {
  meta: DSFrontMatter;
  body: string;
  positioning: string;
  ordering: { headers: string[]; rows: string[][] } | null;
  specGroups: { title: string; rows: [string, string, string?][] }[];
  deliverables: [string, string][] | null;
  compliance: string | null;
  revisionHistory: { headers: string[]; rows: string[][] } | null;
}

export function parseFrontMatter(md: string): { meta: DSFrontMatter; body: string } {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('Missing front matter');
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return {
    meta: {
      code: meta.code ?? '',
      title: meta.title ?? '',
      type: meta.type ?? 'datasheet',
      rev: meta.rev ?? 'A',
      date: meta.date ?? '',
      status: meta.status ?? 'draft',
      family: meta.family ?? '',
      material: meta.material ?? '',
    },
    body: match[2],
  };
}

// ── Markdown table parser ────────────────────────────────────────────

function parseMarkdownTable(block: string): { headers: string[]; rows: string[][] } | null {
  const lines = block.trim().split('\n').filter((l) => l.includes('|'));
  if (lines.length < 2) return null;
  const parse = (line: string) => {
    // Handle escaped pipes (\|) by replacing with placeholder, splitting, then restoring
    const placeholder = '\x00PIPE\x00';
    const safe = line.replace(/\\\|/g, placeholder);
    const cells = safe.split('|').map((c) => c.trim().replaceAll(placeholder, '|')).filter((_, i, arr) => i > 0 && i < arr.length);
    // Strip empty trailing cells (from trailing |)
    while (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
    return cells;
  };
  const headers = parse(lines[0]);
  // Skip separator row (contains ---)
  const dataLines = lines.slice(1).filter((l) => !l.match(/^\s*\|[\s-:|]+\|\s*$/));
  return { headers, rows: dataLines.map(parse) };
}

// ── Section extraction ───────────────────────────────────────────────

function extractSection(body: string, heading: string): string | null {
  const re = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  const start = body.search(re);
  if (start < 0) return null;
  const afterHeading = body.slice(start + heading.length);
  const nextH2 = afterHeading.search(/^## /m);
  return nextH2 >= 0 ? afterHeading.slice(0, nextH2) : afterHeading;
}

function extractSubsections(sectionBody: string): { title: string; body: string }[] {
  const h3Pattern = /^### (.+)$/gm;
  const positions: { title: string; start: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = h3Pattern.exec(sectionBody)) !== null) {
    positions.push({ title: match[1].trim(), start: match.index + match[0].length });
  }
  return positions.map((pos, i) => {
    const end = i + 1 < positions.length ? positions[i + 1].start - positions[i + 1].title.length - 4 : sectionBody.length;
    return { title: pos.title, body: sectionBody.slice(pos.start, end) };
  });
}

// ── Full markdown parser ─────────────────────────────────────────────

export function parseDatasheet(md: string): DSParsed {
  const { meta, body } = parseFrontMatter(md);

  // Positioning: first paragraph (before first ##)
  const beforeH2 = body.split(/^## /m)[0].trim();
  const positioning = beforeH2.split('\n').filter((l) => l.trim()).join(' ').trim();

  // Ordering table
  const orderingSection = extractSection(body, '## Ordering');
  let ordering: DSParsed['ordering'] = null;
  if (orderingSection) {
    ordering = parseMarkdownTable(orderingSection);
  }

  // Specifications
  const specSection = extractSection(body, '## Specifications');
  const specGroups: DSParsed['specGroups'] = [];
  if (specSection) {
    const hasSubsections = specSection.includes('### ');
    if (hasSubsections) {
      for (const sub of extractSubsections(specSection)) {
        const tbl = parseMarkdownTable(sub.body);
        if (tbl) {
          specGroups.push({
            title: sub.title,
            rows: tbl.rows.map((r) => [r[0] ?? '', r[1] ?? '', r[2]]),
          });
        }
      }
    } else {
      // Flat table (like ACC-A-FIX-14)
      const tbl = parseMarkdownTable(specSection);
      if (tbl) {
        specGroups.push({
          title: 'Specifications',
          rows: tbl.rows.map((r) => [r[0] ?? '', r[1] ?? '', r[2]]),
        });
      }
    }
  }

  // Deliverables (may be a subsection of Specifications or standalone section)
  let deliverables: DSParsed['deliverables'] = null;
  const delivSection = extractSection(body, '## Deliverables') ?? extractSection(body, '### Deliverables');
  if (delivSection) {
    const tbl = parseMarkdownTable(delivSection);
    if (tbl) {
      deliverables = tbl.rows.map((r) => [r[0] ?? '', r[1] ?? '']);
    }
  } else {
    // Check inside spec subsections
    const specSec = extractSection(body, '## Specifications');
    if (specSec) {
      for (const sub of extractSubsections(specSec)) {
        if (sub.title === 'Deliverables') {
          const tbl = parseMarkdownTable(sub.body);
          if (tbl) {
            deliverables = tbl.rows.map((r) => [r[0] ?? '', r[1] ?? '']);
          }
        }
      }
    }
  }

  // Compliance
  const compSection = extractSection(body, '## Compliance and customs') ?? extractSection(body, '## Compliance');
  const compliance = compSection?.trim() ?? null;

  // Revision history
  const revSection = extractSection(body, '## Revision history');
  let revisionHistory: DSParsed['revisionHistory'] = null;
  if (revSection) {
    revisionHistory = parseMarkdownTable(revSection);
  }

  return { meta, body, positioning, ordering, specGroups, deliverables, compliance, revisionHistory };
}

// ── Datasheet file loader ────────────────────────────────────────────

function loadDatasheet(code: string): DSParsed {
  const dsDir = resolve(process.cwd(), 'docs/datasheets');
  const mdPath = resolve(dsDir, `${code}.md`);
  const md = readFileSync(mdPath, 'utf-8');
  return parseDatasheet(md);
}

// ── Helper: tag (section label) ──────────────────────────────────────

function tag(text: string): string {
  return `<div class="tag" style="margin-bottom:1.1mm">${text}</div>`;
}

// ── Helper: wrap markdown backtick spans as <span class="mono"> ──────

function mono(text: string): string {
  return text.replace(/`([^`]+)`/g, '<span class="mono">$1</span>');
}

// ── CHA-C specific builders (faithful to build_ds.py) ────────────────

function chaCProductRendering(): string {
  const label =
    'CALIB.TOOLS   CT-CHA-C-200150-6X6   ChArUco 12\u00d717 \u00b7 10/7 mm \u00b7 DICT_6X6_250 \u00b7 IDs 0\u2013101   SN [per unit] \u00b7 Rev A';
  const board = board_svg({
    W: 200, H: 150, rows: 12, cols: 17, sq: 10,
    marker: 7, mx: 15, my: 15,
    dict_name: 'DICT_6X6_250', start_id: 0,
    label, label_w: 170, axes_spec: [4.5, 4.5, 6.5, 0.6],
    mode: 'print', width_mm: 125,
  });
  const coord = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 38" width="43mm" height="27.2mm">
      <rect x="9" y="7" width="40" height="24" fill="#fff" stroke="#666" stroke-width="0.45"/>
      <rect x="13" y="11" width="32" height="16" fill="#f2f2f2" stroke="#b3b3b3" stroke-width="0.25" stroke-dasharray="1.1 1.1"/>
      <circle cx="13" cy="11" r="1" fill="#000"/>
      ${axes(13, 11, 12, 0.68)}
      <text x="9" y="35" font-family="Geist Mono" font-size="2.6" fill="#333">(0, 0) \u00b7 pattern outer corner</text>
    </svg>`;
  const key = `<div class="small" style="line-height:1.43">
      ${tag('Coordinate system')}
      ${coord}
      <div style="margin-top:1mm"><span class="mono">X</span> right \u00b7 <span class="mono">Y</span> down<br>
      OpenCV pattern frame</div>
    </div>`;
  return (
    `<div style="display:grid;grid-template-columns:125mm 1fr;gap:6mm;align-items:start">` +
    `<figure>${board}<figcaption>Rendering \u00b7 200 \u00d7 150 mm variant</figcaption></figure>${key}</div>`
  );
}

function chaCOrderingTable(): string {
  const cols: [string, ColumnKind][] = [
    ['Part number', 'm'], ['Size W \u00d7 H<br>(mm)', 'n'], ['Squares<br>(r \u00d7 c)', 'n'],
    ['Square / marker<br>(mm)', 'n'], ['Dictionary options', 't'],
    ['Corners', 'n'], ['Markers', 'n'], ['Weight<br>(kg)', 'n'],
  ];
  const rows = [
    ['CT-CHA-C-110085-6X6', '110 \u00d7 85', '7 \u00d7 10', '10 / 7.5', '<span class="mono">DICT_6X6_250</span>,<br><span class="mono">DICT_6X6_1000</span>', '54', '35', '0.10'],
    ['CT-CHA-C-150100-6X6', '150 \u00d7 100', '7 \u00d7 11', '12.5 / 9.5', '<span class="mono">DICT_6X6_250</span>,<br><span class="mono">DICT_6X6_1000</span>', '60', '39', '0.17'],
    ['CT-CHA-C-185110-6X6', '185 \u00d7 110', '7 \u00d7 12', '14 / 10.5', '<span class="mono">DICT_6X6_250</span>,<br><span class="mono">DICT_6X6_1000</span>', '66', '42', '0.22'],
    ['CT-CHA-C-230140-6X6', '230 \u00d7 140', '8 \u00d7 14', '15 / 11', '<span class="mono">DICT_6X6_250</span>,<br><span class="mono">DICT_6X6_1000</span>', '91', '56', '0.35'],
  ];
  return table(cols, rows, 'dense rawhead', undefined, ['23%', '11%', '9%', '12%', '19%', '8%', '8%', '10%']);
}

function chaCKeySpecs(): string {
  const cells: [string, string, string][] = [
    ['Accuracy', '\u00b12 \u00b5m', 'feature position \u00b7 20 \u00b0C'],
    ['Substrate', 'Technical ceramic', 'alumina, 3 mm'],
    ['Sizes', '110 \u00d7 85 to 230 \u00d7 140 mm', ''],
    ['Flatness', '\u2264 20 \u00b5m', 'over pattern area'],
  ];
  const parts = cells.map(([lab, val, sub]) =>
    `<div style="padding:1.9mm 2.5mm;min-height:16mm">
      <div class="tag" style="margin-bottom:.45mm">${lab}</div>
      <div class="mono black" style="font-size:9.2pt;line-height:1.25">${val}</div>
      <div class="small muted" style="line-height:1.22">${sub}</div></div>`
  );
  return (
    `<div style="border-top:.35mm solid #000;border-bottom:.25mm solid #b3b3b3;display:grid;` +
    `grid-template-columns:1fr 1.23fr 1.42fr 1fr">${parts.join('')}</div>`
  );
}

function chaCGeometryReference(): string {
  const board = board_svg({
    W: 200, H: 150, rows: 12, cols: 17, sq: 10,
    marker: 7, mx: 15, my: 15,
    dict_name: 'DICT_6X6_250', start_id: 0, axes_spec: null,
    mode: 'map', width_mm: 62, origin: true,
  });
  const details = kv([
    ['Reference pattern', '<span class="mono">12 \u00d7 17</span> squares \u00b7 <span class="mono">10 / 7 mm</span>.'],
    ['Marker IDs', '<span class="mono">0\u2013101</span>, row-major through white squares.'],
    ['Coordinate frame', 'Origin at the top-left outer pattern corner; X right, Y down.'],
    ['Version control', 'Current <span class="mono">\u2265 4.6</span> convention for an even-row board; no legacy pattern setting.'],
  ]);
  return (
    `<div class="box" style="padding:2mm 3mm;margin:.8mm 0 .8mm">` +
    `<div style="display:grid;grid-template-columns:66mm 1fr;gap:6mm;align-items:center">` +
    `<figure>${board}<figcaption>Geometry reference \u00b7 pattern envelope shown.</figcaption></figure>` +
    `<div>${tag('Pattern convention')}${details}</div></div></div>`
  );
}

function chaCSpecTables(): string {
  const geoTable = table(
    [['Feature', 't'], ['Specification', 't'], ['Condition / note', 't']],
    [
      ['Feature position accuracy', '<span class="mono">\u00b12 \u00b5m</span>', 'At 20 \u00b0C; ChArUco corner positions.'],
      ['Edge definition', 'Sharp black / white transition', '\u2264 1 \u00b5m lithographic edge.'],
      ['Orthogonality', '<span class="mono">90\u00b0 \u00b1 0.002\u00b0</span>', 'Pattern axes.'],
      ['Start ID / placement', '<span class="mono">0</span> \u00b7 row-major', 'Black square top-left; marker IDs advance through white squares.'],
      ['OpenCV pattern convention', 'OpenCV <span class="mono">\u2265 4.6</span> layout', 'Even-row boards. Older-board layouts require <span class="mono">CharucoBoard.setLegacyPattern(True)</span>.'],
    ],
    '', undefined, ['25%', '24%', '51%'],
  );

  const phyTable = table(
    [['Feature', 't'], ['Specification', 't']],
    [
      ['Substrate', 'Alumina ceramic (Al\u2082O\u2083 \u2265 96 %), white, 3 mm.'],
      ['Pattern process', 'Lithographed chrome; blue-black, low gloss.'],
      ['Flatness', '<span class="mono">\u2264 20 \u00b5m</span> over the pattern area.'],
      ['Surface', '<span class="mono">Ra \u2264 0.4 \u00b5m</span>; lapped, non-glare.'],
      ['Edges', '<span class="mono">0.5 mm</span> chamfer, ground.'],
      ['Weight', '<span class="mono">\u2248 11 kg/m\u00b2</span>; 150 \u00d7 100: <span class="mono">0.17 kg</span>.'],
      ['Mounting', 'No holes. Use ACC-A-FIX-14 fixture, vacuum chuck or kinematic mount.'],
    ],
    '', undefined, ['28%', '72%'],
  );

  const envTable = table(
    [['Feature', 't'], ['Specification', 't']],
    [
      ['Operating temperature', '<span class="mono">\u221250 to +200 \u00b0C</span>.'],
      ['Thermal expansion', 'Approx. <span class="mono">7.2 \u00b5m/(m\u00b7\u00b0C)</span> (alumina).'],
      ['Chemical resistance', 'Inert to water, alcohols, common solvents.'],
      ['Cleaning', 'Lens tissue + isopropyl alcohol; no abrasives.'],
    ],
    '', undefined, ['28%', '72%'],
  );

  return (
    section(1, 'Specifications \u00b7 geometry') + geoTable +
    chaCGeometryReference() +
    section(2, 'Specifications \u00b7 physical') + phyTable +
    section(3, 'Specifications \u00b7 environment') + envTable
  );
}

function chaCDeliverablesBox(): string {
  const left = '<div>' + tag('In the box') + kv([
    ['Board', 'ChArUco ceramic target, selected part number.'],
    ['Packaging', 'Padded case and handling information.'],
    ['Report', 'Inspection report and measured CSV for each serialised unit.'],
    ['Files', '<span class="mono">.opencv.json \u00b7 .kalibr.yaml \u00b7 .ros2.yaml<br>.halcon.descr \u00b7 .dxf \u00b7 measured CSV</span>'],
  ]) + '</div>';
  const right = '<div>' + tag('Configuration & service') + kv([
    ['Marking on board', 'Label line with part / pattern / SN / Rev; printed X / Y arrows.'],
    ['Lead time', LEAD_TIME + '.'],
    ['Options', 'Fixture \u00b7 <span class="mono">SVC-X-CERT-ILAC</span> \u00b7 custom NRE.'],
  ]) + '</div>';
  return `<div class="box"><div class="cols" style="grid-template-columns:1fr 1fr">${left}${right}</div></div>`;
}

function chaCCompatibilityTable(): string {
  return table(
    [['Software', 't'], ['Use / caution', 't']],
    [
      ['OpenCV', 'ChArUco board with <span class="mono">DICT_6X6_250</span>; this board follows the OpenCV <span class="mono">\u2265 4.6</span> convention. Do not enable legacy pattern for this board.'],
      ['Kalibr', 'No native ChArUco target model. The supplied <span class="mono">.kalibr.yaml</span> is a geometry reference and needs integration-specific adaptation.'],
      ['HALCON', 'Use the supplied descriptor as setup data for the applicable calibration workflow; confirm operator and release compatibility before deployment.'],
      ['MATLAB', 'Intended for the Computer Vision Toolbox ChArUco workflow (R2024a or later\u2014confirm release support before use).'],
      ['ROS 2', 'Use a <span class="mono">charuco</span> pattern configuration where supported by the selected <span class="mono">camera_calibration</span> package; confirm package parameters first.'],
    ],
    '', undefined, ['18%', '82%'],
  );
}

function chaCDrawingSvg(): string {
  const W = 200, H = 150, mx = 15, my = 15;
  const patW = W - 2 * mx, patH = H - 2 * my;
  const dims = [
    dim_h(0, W, 173, `W ${W} mm`, H, 4.0),
    dim_v(-20, 0, H, `H ${H} mm`, 0, 4.0),
    dim_h(mx, W - mx, -12, `pattern ${patW} mm`, 0, 3.4),
    dim_v(216, my, H - my, `pattern ${patH} mm`, W, 3.4),
    dim_h(0, mx, -27, `${mx}`, 0, 3.0),
    dim_v(232, 0, my, `${my}`, W, 3.0),
    dim_v(270, 77, 81, 't 3.0 mm', 252, 3.4),
  ].join('');

  return `<figure style="margin:0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="-37 -37 322 228" width="137mm" height="97mm">
        <rect x="0" y="0" width="${W}" height="${H}" fill="#fff" stroke="#000" stroke-width="0.55"/>
        <rect x="${mx}" y="${my}" width="${patW}" height="${patH}" fill="#f2f2f2" stroke="#666" stroke-width="0.35" stroke-dasharray="2 1.3"/>
        <path d="M0 5L5 0 M195 0L200 5 M0 145L5 150 M195 150L200 145" stroke="#333" stroke-width="0.5" fill="none"/>
        <line x1="194" y1="7" x2="248" y2="-9" stroke="#666" stroke-width="0.25"/>
        <text x="250" y="-10" font-family="Geist Mono" font-size="3.4" fill="#333">0.5 mm chamfer</text>
        <text x="100" y="78" font-family="Geist Mono" font-size="4.6" fill="#666" text-anchor="middle">PATTERN AREA</text>
        <text x="100" y="85" font-family="Geist Mono" font-size="3.6" fill="#666" text-anchor="middle">${patW} \u00d7 ${patH} mm</text>
        <text x="100" y="145.5" font-family="Geist Mono" font-size="3.3" fill="#666" text-anchor="middle">${mx} mm white margin</text>
        <text x="218" y="68" font-family="Geist Mono" font-size="3.3" fill="#666">SIDE SECTION</text>
        <rect x="220" y="77" width="32" height="3" fill="#f2f2f2" stroke="#000" stroke-width="0.35"/>
        <text x="236" y="89" font-family="Geist Mono" font-size="3.3" fill="#666" text-anchor="middle">no mounting holes</text>
        ${dims}
      </svg>
      <figcaption>CT-DWG-CHA-C-200150 \u00b7 Rev A \u00b7 dimensions nominal unless stated.</figcaption>
    </figure>`;
}

// ── Generic spec table from parsed markdown ──────────────────────────

function genericSpecTable(group: DSParsed['specGroups'][0]): string {
  const has3cols = group.rows.some((r) => r[2] != null && r[2] !== undefined);
  if (has3cols) {
    return table(
      [['Feature', 't'], ['Specification', 't'], ['Condition / note', 't']],
      group.rows.map((r) => [mono(r[0]), mono(r[1]), mono(r[2] ?? '')]),
      '', undefined, ['25%', '24%', '51%'],
    );
  }
  return table(
    [['Feature', 't'], ['Specification', 't']],
    group.rows.map((r) => [mono(r[0]), mono(r[1])]),
    '', undefined, ['28%', '72%'],
  );
}

function genericOrderingTable(ordering: DSParsed['ordering']): string {
  if (!ordering) return '';
  const cols: [string, ColumnKind][] = ordering.headers.map((h): [string, ColumnKind] => [h, 't']);
  return table(cols, ordering.rows.map((r) => r.map(mono)), 'dense rawhead');
}

function genericComplianceTable(compliance: string): string {
  const cols: [string, ColumnKind][] = [['Topic', 't'], ['Statement', 't']];
  // Parse compliance text into rows
  const rows: string[][] = [];
  const parts = compliance.split(/[.;]/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.toLowerCase().startsWith('rohs')) {
      rows.push(['RoHS', part + '.']);
    } else if (part.includes('HS ')) {
      rows.push(['HS code', `<span class="mono">${part.match(/HS\s+([\d\s]+)/)?.[1]?.trim() ?? ''}</span>`]);
    } else if (part.toLowerCase().includes('fragile') || part.toLowerCase().includes('ship')) {
      rows.push(['Packaging', part + '.']);
    } else if (rows.length === 0) {
      rows.push(['General', part + '.']);
    } else {
      // Append to last row
      rows[rows.length - 1][1] += ' ' + part + '.';
    }
  }
  if (rows.length === 0) {
    rows.push(['General', compliance]);
  }
  return table(cols, rows, '', undefined, ['22%', '78%']);
}

function genericRevisionTable(revHistory: DSParsed['revisionHistory']): string {
  if (!revHistory) return '';
  return table(
    [['Rev', 'm'], ['Date', 'm'], ['Change', 't']],
    revHistory.rows,
    '', undefined, ['13%', '23%', '64%'],
  );
}

// ── CHA-C builder (faithful to build_ds.py) ──────────────────────────

function buildChaC(ds: DSParsed, watermark?: string): Doc {
  const FILE_URL = 'https://calib.tools/files/CT-DS-CHA-C';
  const DXF_URL = 'https://calib.tools/files/CT-DWG-CHA-C-200150.dxf';

  const d = new Doc(
    'CT-DS-CHA-C', ds.meta.rev, ds.meta.date,
    'Datasheet',
    'ChArUco calibration target \u00b7 ceramic',
    undefined, undefined, watermark,
  );

  // Page 1
  const page1 =
    p('A rigid technical-ceramic ChArUco target for precise camera calibration where dimensional stability, sharp features and durable handling matter.')
    + chaCProductRendering()
    + section(1, 'Ordering', 'PRINT VERSION \u00b7 prices online')
    + chaCOrderingTable()
    + p('All variants: white margin \u00b7 marker side 0.7\u20130.75 \u00d7 square side \u00b7 alumina ceramic, 3 mm.', 'small')
    + p('<span class="mono">Prices:</span> calib.tools/targets', 'small muted')
    + section(2, 'Key specifications')
    + chaCKeySpecs();
  d.addPage(page1);

  // Page 2
  const page2 =
    p('Unless stated otherwise, dimensions are nominal at <span class="mono">20 \u00b0C</span>. Specifications apply to the product family; per-unit results are issued in the inspection report.', 'small')
    + chaCSpecTables();
  d.addPage(page2);

  // Page 3
  const page3 =
    section(3, 'Deliverables')
    + chaCDeliverablesBox()
    + section(4, 'Compatibility')
    + chaCCompatibilityTable()
    + section(5, 'Drawing', '200 \u00d7 150 mm reference variant')
    + `<div style="display:grid;grid-template-columns:140mm 1fr;gap:7mm;align-items:end">${chaCDrawingSvg()}`
    + `<div class="small" style="padding-bottom:5mm"><div class="tag" style="margin-bottom:1mm">DXF download</div>`
    + `<div class="mono black" style="font-size:7.5pt;overflow-wrap:anywhere">${DXF_URL.replace('https://', '')}</div>`
    + `<div class="muted" style="margin-top:1.5mm">Drawing reference only; use the released DXF for fixture design.</div></div></div>`;
  d.addPage(page3);

  // Page 4
  const disclaimer = 'Values are nominal unless stated as measured; per-unit values are in the inspection report CT-IR-&lt;SN&gt;.';
  const compRows: string[][] = [
    ['RoHS', 'RoHS-compliant materials.'],
    ['HS code', '<span class="mono">9031 80</span>'],
    ['Packaging', 'Padded case inside a carton; FRAGILE.'],
    ['Handling', 'FRAGILE \u00b7 handle by edges; protect the patterned surface from impact and abrasion.'],
  ];
  const page4 =
    section(6, 'Compliance & customs')
    + table([['Topic', 't'], ['Statement', 't']], compRows, '', undefined, ['22%', '78%'])
    + section(7, 'Revision history')
    + genericRevisionTable(ds.revisionHistory)
    + section(8, 'Disclaimer')
    + p(disclaimer, 'statement')
    + `<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end;border-top:.25mm solid #b3b3b3;padding-top:4mm">`
    + `<div class="small muted" style="max-width:94mm">Product configuration, lead time and regulatory statements remain subject to the confirmations identified in this datasheet.</div>`
    + `${qr_block(FILE_URL, 15)}</div>`;
  d.addPage(page4);

  return d;
}

// ── Generic board-product datasheet builder ───────────────────────────

function buildGenericBoardDS(ds: DSParsed, watermark?: string): Doc {
  const code = ds.meta.code;
  const FILE_URL = `https://calib.tools/files/${code}`;

  const d = new Doc(
    code, ds.meta.rev, ds.meta.date,
    'Datasheet', ds.meta.title,
    undefined, undefined, watermark,
  );

  // Page 1: positioning + ordering + key specs
  let page1 = p(ds.positioning);
  if (ds.ordering) {
    page1 += section(1, 'Ordering') + genericOrderingTable(ds.ordering);
  }
  // Key specs from first spec group
  const specGroups = ds.specGroups.filter((g) => g.title !== 'Deliverables');
  if (specGroups.length > 0) {
    page1 += section(2, 'Key specifications');
    // Extract first values for a summary strip
    const geo = specGroups.find((g) => g.title.toLowerCase().includes('geometry'));
    const phys = specGroups.find((g) => g.title.toLowerCase().includes('physical'));
    if (geo && phys) {
      const accuracy = geo.rows[0];
      const substrate = phys.rows.find((r) => r[0].toLowerCase().includes('substrate'));
      const flatness = phys.rows.find((r) => r[0].toLowerCase().includes('flatness'));
      const cells: [string, string][] = [];
      if (accuracy) cells.push(['Accuracy', accuracy[1]]);
      if (substrate) cells.push(['Substrate', substrate[1]]);
      if (flatness) cells.push(['Flatness', flatness[1]]);
      if (cells.length > 0) {
        const parts = cells.map(([lab, val]) =>
          `<div style="padding:1.9mm 2.5mm;min-height:14mm">` +
          `<div class="tag" style="margin-bottom:.45mm">${lab}</div>` +
          `<div style="font-size:9.2pt;line-height:1.25">${mono(val)}</div></div>`
        );
        page1 += `<div style="border-top:.35mm solid #000;border-bottom:.25mm solid #b3b3b3;display:grid;grid-template-columns:${cells.map(() => '1fr').join(' ')}">${parts.join('')}</div>`;
      }
    }
  }
  d.addPage(page1);

  // Page 2: spec tables
  let page2 = p('Unless stated otherwise, dimensions are nominal at <span class="mono">20 \u00b0C</span>.', 'small');
  let secN = 1;
  for (const group of specGroups) {
    page2 += section(secN, `Specifications \u00b7 ${group.title.toLowerCase()}`) + genericSpecTable(group);
    secN++;
  }
  d.addPage(page2);

  // Page 3: deliverables + compliance + revision
  let page3 = '';
  if (ds.deliverables) {
    page3 += section(secN, 'Deliverables');
    // Format deliverables as a two-column box
    const left = '<div>' + tag('Included') + kv(
      ds.deliverables
        .filter((_, i) => i < Math.ceil(ds.deliverables!.length / 2))
        .map(([k, v]) => [k, mono(v)] as [string, string])
    ) + '</div>';
    const right = '<div>' + tag('Service') + kv(
      ds.deliverables
        .filter((_, i) => i >= Math.ceil(ds.deliverables!.length / 2))
        .map(([k, v]) => [k, mono(v)] as [string, string])
    ) + '</div>';
    page3 += `<div class="box"><div class="cols" style="grid-template-columns:1fr 1fr">${left}${right}</div></div>`;
    secN++;
  }
  if (ds.compliance) {
    page3 += section(secN, 'Compliance & customs') + genericComplianceTable(ds.compliance);
    secN++;
  }
  if (ds.revisionHistory) {
    page3 += section(secN, 'Revision history') + genericRevisionTable(ds.revisionHistory);
    secN++;
  }
  const disclaimer = 'Values are nominal unless stated as measured; per-unit values are in the inspection report.';
  page3 += section(secN, 'Disclaimer') + p(disclaimer, 'statement');
  page3 += `<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end;border-top:.25mm solid #b3b3b3;padding-top:4mm">`;
  page3 += `<div class="small muted" style="max-width:94mm">Product configuration, lead time and regulatory statements remain subject to the confirmations identified in this datasheet.</div>`;
  page3 += `${qr_block(FILE_URL, 15)}</div>`;
  d.addPage(page3);

  return d;
}

// ── Accessory datasheet (no board rendering) ─────────────────────────

function buildAccessoryDS(ds: DSParsed, watermark?: string): Doc {
  const code = ds.meta.code;
  const FILE_URL = `https://calib.tools/files/${code}`;

  const d = new Doc(
    code, ds.meta.rev, ds.meta.date,
    'Datasheet', ds.meta.title,
    undefined, undefined, watermark,
  );

  // Page 1: positioning + specs
  let page1 = p(ds.positioning);
  let secN = 1;
  for (const group of ds.specGroups) {
    page1 += section(secN, group.title === 'Specifications' ? 'Specifications' : `Specifications \u00b7 ${group.title.toLowerCase()}`);
    page1 += genericSpecTable(group);
    secN++;
  }

  // Instructions (from body)
  const instrSection = extractSection(ds.body, '## Instructions');
  if (instrSection) {
    page1 += section(secN, 'Instructions');
    // Parse bullet points
    const lines = instrSection.trim().split('\n').filter((l) => l.trim());
    const items = lines.map((l) => `<li>${mono(l.replace(/^[-*]\s+/, '').trim())}</li>`).join('');
    page1 += `<ul class="l">${items}</ul>`;
    secN++;
  }

  if (ds.compliance) {
    page1 += section(secN, 'Compliance & customs') + genericComplianceTable(ds.compliance);
    secN++;
  }
  if (ds.revisionHistory) {
    page1 += section(secN, 'Revision history') + genericRevisionTable(ds.revisionHistory);
    secN++;
  }

  page1 += `<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end;border-top:.25mm solid #b3b3b3;padding-top:4mm">`;
  page1 += `<div class="small muted" style="max-width:94mm">Specifications subject to change.</div>`;
  page1 += `${qr_block(FILE_URL, 15)}</div>`;
  d.addPage(page1);

  return d;
}

// ── Main buildDS entry point ─────────────────────────────────────────

export async function buildDS(opts: {
  code: string;
  outBase: string;
  watermark?: string;
}): Promise<RenderResult> {
  const { code, outBase, watermark } = opts;

  const ds = loadDatasheet(code);

  let doc: Doc;
  if (code === 'CT-DS-CHA-C') {
    doc = buildChaC(ds, watermark);
  } else if (code === 'CT-SV-CERT-ILAC') {
    // Delegate to ILAC cert builder
    const { buildILACCert } = await import('./ct-sv-cert-ilac');
    return buildILACCert({ code, outBase, watermark });
  } else if (ds.meta.family === 'ACC') {
    doc = buildAccessoryDS(ds, watermark);
  } else {
    // CHA-P, CHT-P, and other board-based datasheets
    doc = buildGenericBoardDS(ds, watermark);
  }

  return doc.render(outBase);
}

// Re-export parser for tests
export { loadDatasheet, parseDatasheet as _parseDatasheet };
