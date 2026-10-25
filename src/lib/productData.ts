/**
 * Product data layer — loads datasheet markdown at build time and merges
 * with Shopify metafields. Metafields win on conflict.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Types ─────────────────────────────────────────────────────────────

export interface OrderingRow {
  partNumber: string;
  size: string;
  squares: string;
  squareMarker: string;
  dictionary: string;
  corners: string;
  markers: string;
  weight: string;
}

export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecGroup {
  title: string;
  rows: SpecRow[];
}

export interface ProductData {
  positioning: string;
  orderingRows: OrderingRow[];
  specGroups: SpecGroup[];
  rev: string;
  datasheetCode: string;
}

// ── Handle → datasheet path mapping ───────────────────────────────────

const HANDLE_TO_DATASHEET: Record<string, string> = {
  'checkerboard-composite': 'CT-DS-CHT-P.md',
  'charuco-composite': 'CT-DS-CHA-P.md',
  'charuco-ceramic': 'CT-DS-CHA-C.md',
  'mounting-fixture': 'CT-DS-ACC-A-FIX-14.md',
  'certificate-ilac': 'CT-SV-CERT-ILAC.md',
};

// ── Markdown parsing helpers ──────────────────────────────────────────

function parseFrontmatter(md: string): { meta: Record<string, string>; body: string } {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: md };
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return { meta, body: match[2] };
}

function firstSentence(text: string): string {
  // Take text before first ## heading, get first sentence
  const beforeHeading = text.split(/^##\s/m)[0].trim();
  if (!beforeHeading) return '';
  // First sentence ends at period followed by space or end
  const m = beforeHeading.match(/^(.+?\.)\s/);
  return m ? m[1].trim() : beforeHeading.split('\n')[0].trim();
}

function parseMarkdownTable(block: string): string[][] {
  const lines = block.trim().split('\n').filter((l) => l.includes('|'));
  if (lines.length < 2) return [];
  // Skip separator row (contains ---)
  const dataLines = lines.filter((l) => !l.match(/^\s*\|[\s-:|]+\|\s*$/));
  return dataLines.map((line) =>
    line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length),
  );
}

function parseOrderingTable(body: string): OrderingRow[] {
  const section = extractSection(body, '## Ordering');
  if (!section) return [];
  const rows = parseMarkdownTable(section);
  if (rows.length < 2) return []; // need header + at least 1 data row
  const header = rows[0].map((h) => h.toLowerCase());
  return rows.slice(1).map((cells) => ({
    partNumber: cells[header.indexOf('part number')] ?? cells[0] ?? '',
    size: cells[header.indexOf('size (w × h)')] ?? cells[header.indexOf('size')] ?? cells[1] ?? '',
    squares: cells[header.indexOf('squares (rows × cols)')] ?? cells[header.indexOf('squares')] ?? cells[2] ?? '',
    squareMarker: cells[header.indexOf('square / marker')] ?? cells[3] ?? '',
    dictionary: cells[header.indexOf('dictionary')] ?? cells[4] ?? '',
    corners: cells[header.indexOf('corners')] ?? cells[5] ?? '',
    markers: cells[header.indexOf('markers')] ?? cells[6] ?? '',
    weight: cells[header.indexOf('weight')] ?? '',
  }));
}

function extractSection(body: string, heading: string): string | null {
  const re = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  const start = body.search(re);
  if (start < 0) return null;
  const afterHeading = body.slice(start + heading.length);
  // Find next ## heading
  const nextH2 = afterHeading.search(/^## /m);
  return nextH2 >= 0 ? afterHeading.slice(0, nextH2) : afterHeading;
}

function parseSpecGroups(body: string): SpecGroup[] {
  const section = extractSection(body, '## Specifications');
  if (!section) return [];
  const groups: SpecGroup[] = [];
  const h3Pattern = /^### (.+)$/gm;
  let match: RegExpExecArray | null;
  const h3Positions: Array<{ title: string; start: number }> = [];

  while ((match = h3Pattern.exec(section)) !== null) {
    h3Positions.push({ title: match[1].trim(), start: match.index + match[0].length });
  }

  for (let i = 0; i < h3Positions.length; i++) {
    const start = h3Positions[i].start;
    const end = i + 1 < h3Positions.length ? h3Positions[i + 1].start - h3Positions[i + 1].title.length - 4 : section.length;
    const block = section.slice(start, end);
    const tableRows = parseMarkdownTable(block);
    const rows: SpecRow[] = tableRows
      .filter((r) => r.length >= 2 && r[0].trim())
      .map((r) => ({ label: r[0].trim(), value: r[1].trim() }));
    if (rows.length > 0) {
      groups.push({ title: h3Positions[i].title, rows });
    }
  }
  return groups;
}

// ── Main API ──────────────────────────────────────────────────────────

export function getProductData(
  handle: string,
  metafields: Record<string, string>,
): ProductData | null {
  const filename = HANDLE_TO_DATASHEET[handle];
  if (!filename) return null;

  const dsPath = resolve(process.cwd(), 'docs/datasheets', filename);
  let md: string;
  try {
    md = readFileSync(dsPath, 'utf-8');
  } catch {
    return null;
  }

  const { meta, body } = parseFrontmatter(md);
  const positioning = firstSentence(body);
  const orderingRows = parseOrderingTable(body);
  const specGroups = parseSpecGroups(body);

  // Merge metafields into spec groups (metafields win on conflict)
  const METAFIELD_TO_SPEC: Record<string, { group: string; label: string; unit?: string }> = {
    feature_tolerance: { group: 'Geometry', label: 'Feature position accuracy' },
    flatness: { group: 'Physical', label: 'Flatness' },
    material: { group: 'Physical', label: 'Substrate' },
    operating_temp: { group: 'Environment', label: 'Operating temperature' },
    cte: { group: 'Environment', label: 'Thermal expansion' },
    weight_g: { group: 'Physical', label: 'Weight', unit: 'g' },
    thickness_mm: { group: 'Physical', label: 'Thickness', unit: 'mm' },
  };

  for (const [key, mapping] of Object.entries(METAFIELD_TO_SPEC)) {
    const mfValue = metafields[key];
    if (!mfValue) continue;
    const value = mapping.unit && !mfValue.includes(mapping.unit)
      ? `${mfValue} ${mapping.unit}`
      : mfValue;
    const group = specGroups.find((g) => g.title === mapping.group);
    if (group) {
      const existing = group.rows.find((r) => r.label === mapping.label);
      if (existing) {
        if (existing.value !== value) {
          console.warn(`[productData] Conflict for ${handle} "${mapping.label}": datasheet="${existing.value}" metafield="${value}" → using metafield`);
          existing.value = value;
        }
      } else {
        group.rows.push({ label: mapping.label, value });
      }
    }
  }

  return {
    positioning,
    orderingRows,
    specGroups,
    rev: meta.rev ?? '',
    datasheetCode: meta.code ?? '',
  };
}
