/**
 * Part number → product page, for the "Have a part number?" box on the home page.
 * The index is built from data/part-numbers.csv at build time (active rows only)
 * and handed to the page; the lookup itself runs in the browser.
 */
import { CATALOG } from './catalogPatterns';

/** Upper case, "×" and spaces normalized, "CT-" added when left out. */
export function normalizePartNumber(raw: string): string {
  let v = raw.trim().toUpperCase().replace(/×/g, 'X').replace(/\s*X\s*/g, 'X').replace(/\s+/g, '-').replace(/-+/g, '-');
  if (v && !v.startsWith('CT-')) v = `CT-${v}`;
  return v;
}

/** { partNumber: productHandle } for active rows of data/part-numbers.csv. */
export function partNumberIndex(csv: string): Record<string, string> {
  const [header, ...lines] = csv.trim().split('\n');
  const cols = header.split(',');
  const iPn = cols.indexOf('pn'), iStatus = cols.indexOf('status'), iHandle = cols.indexOf('product_handle');
  const out: Record<string, string> = {};
  for (const line of lines) {
    // name_en is quoted and may contain commas; pn, status and the handle never do
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '')) ?? [];
    if (cells[iStatus] === 'active' && cells[iPn] && cells[iHandle]) out[cells[iPn]] = cells[iHandle];
  }
  return out;
}

/** Product page for a part number, with the variant preselected where we know its options. */
export function resolvePartNumber(raw: string, index: Record<string, string>): string | undefined {
  const pn = normalizePartNumber(raw);
  if (!/^CT-[A-Z0-9-]{3,24}$/.test(pn)) return undefined;
  const size = /-(\d+X\d+)(-|$)/.exec(pn)?.[1].toLowerCase();

  const handle = index[pn];
  if (handle) {
    const entry = CATALOG.find((e) => e.partNumber === pn);
    if (entry) return `/targets/${entry.handle}/?${new URLSearchParams(entry.options).toString()}`;
    return size ? `/targets/${handle}/?size=${size}` : `/targets/${handle}/`;
  }
  // Family + material + size without the variant: every match must be the same product
  const handles = new Set(Object.keys(index).filter((k) => k.startsWith(`${pn}-`)).map((k) => index[k]));
  if (size && handles.size === 1) return `/targets/${[...handles][0]}/?size=${size}`;
  return undefined;
}
