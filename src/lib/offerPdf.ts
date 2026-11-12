/**
 * Quotation PDF (CT-QT) for custom offers, drawn with pdf-lib so it can be built inside a
 * Cloudflare Pages Function. Layout follows docs/design/customer-docs/CT-QT (Q00017):
 * page 1 = quote details, items, total, commercial terms; page 2 = technical annex and
 * acceptance. All text comes from the offer data; nothing here is specific to one customer.
 */
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { DOC_COLORS, hexToUnitRgb } from './docColors';
import { WORDMARK_PATHS, WORDMARK_DOT_RECT } from './exportBrand';
import { CONTACT_LINE } from './reportConfig';

export interface OfferItem {
  partNo?: string;
  description: string;
  /** Short spec lines shown next to the description. */
  spec?: string[];
  qty: number;
  unitPrice: number;
  leadTime?: string;
  /** An option is listed with its price but left out of the total. */
  option?: boolean;
}

export interface OfferData {
  no: string;
  rev?: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  validUntil: string;
  reference?: string;
  currency: string;
  /** Printed after the total, e.g. "excl. import duties and taxes". */
  taxNote: string;
  intro?: string;
  seller: { name: string; address: string[]; email: string };
  customer: { name: string; contact?: string; department?: string; address?: string[] };
  items: OfferItem[];
  /** One-time charge (tooling, engineering). */
  nre?: { description: string; note?: string; price: number };
  /** price omitted = "quoted separately". */
  shipping?: { label: string; price?: number };
  terms: {
    /** Label and text, e.g. ["Incoterms", "DAP …"]. */
    deliveryPayment: [string, string][];
    included?: string[];
    options?: string[];
  };
  annex: {
    reference?: string;
    /** Label and value, the specification as confirmed with the customer. */
    specs: [string, string][];
    notes?: [string, string][];
  };
  signatory: { name: string; title: string };
  /** Diagonal mark across both pages, e.g. "SAMPLE". */
  watermark?: string;
}

export interface OfferFonts {
  regular: ArrayBuffer;
  semiBold: ArrayBuffer;
  mono: ArrayBuffer;
}

const isStr = (v: unknown, max = 400): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const isStrList = (v: unknown, maxItems = 40): v is string[] => Array.isArray(v) && v.length <= maxItems && v.every((x) => isStr(x));
const isPairs = (v: unknown, maxItems = 40): v is [string, string][] =>
  Array.isArray(v) && v.length <= maxItems && v.every((p) => Array.isArray(p) && p.length === 2 && isStr(p[0], 60) && isStr(p[1]));
const isMoney = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e9;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Returns the reason the data cannot be printed, or null when it is complete. */
export function offerProblem(d: any): string | null {
  if (!d || typeof d !== 'object') return 'not an object';
  if (!isStr(d.no, 40)) return 'no';
  if (!isDate(d.date) || !isDate(d.validUntil)) return 'date';
  if (!/^[A-Z]{3}$/.test(d.currency ?? '')) return 'currency';
  if (!isStr(d.taxNote, 80)) return 'taxNote';
  if (!d.seller || !isStr(d.seller.name, 80) || !isStrList(d.seller.address, 6) || !isStr(d.seller.email, 80)) return 'seller';
  if (!d.customer || !isStr(d.customer.name, 120)) return 'customer';
  if (d.customer.address !== undefined && !isStrList(d.customer.address, 8)) return 'customer.address';
  if (!Array.isArray(d.items) || d.items.length < 1 || d.items.length > 12) return 'items';
  for (const it of d.items) {
    if (!it || !isStr(it.description, 160) || !Number.isInteger(it.qty) || it.qty < 1 || !isMoney(it.unitPrice)) return 'item';
    if (it.spec !== undefined && !isStrList(it.spec, 6)) return 'item.spec';
  }
  if (d.nre !== undefined && (!isStr(d.nre.description, 200) || !isMoney(d.nre.price))) return 'nre';
  if (d.shipping !== undefined && (!isStr(d.shipping.label, 60) || (d.shipping.price !== undefined && !isMoney(d.shipping.price)))) return 'shipping';
  if (!d.terms || !isPairs(d.terms.deliveryPayment, 8)) return 'terms';
  if (d.terms.included !== undefined && !isStrList(d.terms.included, 8)) return 'terms.included';
  if (d.terms.options !== undefined && !isStrList(d.terms.options, 8)) return 'terms.options';
  if (!d.annex || !isPairs(d.annex.specs, 30) || d.annex.specs.length < 1) return 'annex';
  if (d.annex.notes !== undefined && !isPairs(d.annex.notes, 4)) return 'annex.notes';
  if (!d.signatory || !isStr(d.signatory.name, 80) || !isStr(d.signatory.title, 80)) return 'signatory';
  return null;
}

export const money = (v: number): string => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Sum of the items that count (options are left out), the one-time charge and shipping. */
export function offerTotals(d: OfferData): { items: number; total: number } {
  const items = d.items.filter((i) => !i.option).reduce((s, i) => s + i.qty * i.unitPrice, 0);
  return { items, total: items + (d.nre?.price ?? 0) + (d.shipping?.price ?? 0) };
}

// Frame brackets of the framed wordmark, in the same coordinates as WORDMARK_PATHS
// (public/brand/wordmark-framed-light.svg).
const FRAME_RECTS: readonly (readonly [number, number, number, number])[] = [
  [-271, -1269.5, 568, 98], [-271, -1269.5, 98, 568], [-271, 461.5, 568, 98], [-271, -8.5, 98, 568],
  [6929, -1269.5, 568, 98], [7399, -1269.5, 98, 568], [6929, 461.5, 568, 98], [7399, -8.5, 98, 568],
];
const FRAMED_VB = { minX: -285.2, minY: -1283.7, width: 7796.4, height: 1857.4 };

const MM = 72 / 25.4;
const PAGE_W = 210 * MM;
const PAGE_H = 297 * MM;
const LEFT = 16 * MM;
const WIDTH = 178 * MM;
const RIGHT = LEFT + WIDTH;

const col = (hex: string) => rgb(...hexToUnitRgb(hex));
const BLACK = col(DOC_COLORS.black);
const MUTED = col(DOC_COLORS.inkMuted);
const SOFT = col(DOC_COLORS.inkSoft);
const LINE = col(DOC_COLORS.lineStrong);
const HAIR = col(DOC_COLORS.paperAlt);
const RED = col(DOC_COLORS.red);

/** Break text into lines that fit a width; a word longer than the width is split. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) { line = next; continue; }
      if (line) out.push(line);
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
        let n = rest.length - 1;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > maxWidth) n--;
        out.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

/** Quotation PDF, two A4 pages. Throws when the data is incomplete. */
export async function offerPdf(d: OfferData, fonts: OfferFonts): Promise<Uint8Array> {
  const problem = offerProblem(d);
  if (problem) throw new Error(`offer data: ${problem}`);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Quotation ${d.no}`);
  doc.setAuthor('Calib.Tools');
  doc.setCreator('calib.tools');
  const sans = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.semiBold, { subset: true });
  const mono = await doc.embedFont(fonts.mono, { subset: true });

  const headerId = [d.no, d.rev ? `Rev ${d.rev}` : null, d.date].filter(Boolean).join(' · ');
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  /** Distance from the top of the page, in points. */
  let y = 0;

  const text = (s: string, x: number, top: number, font: PDFFont, size: number, color = BLACK) =>
    page.drawText(s, { x, y: PAGE_H - top - size * 0.78, font, size, color });
  const textRight = (s: string, right: number, top: number, font: PDFFont, size: number, color = BLACK) =>
    text(s, right - font.widthOfTextAtSize(s, size), top, font, size, color);
  const rule = (top: number, x0 = LEFT, x1 = RIGHT, thickness = 0.7, color = BLACK) =>
    page.drawLine({ start: { x: x0, y: PAGE_H - top }, end: { x: x1, y: PAGE_H - top }, thickness, color });
  const box = (x: number, top: number, w: number, h: number, thickness = 0.7, color = LINE) =>
    page.drawRectangle({ x, y: PAGE_H - top - h, width: w, height: h, borderWidth: thickness, borderColor: color });
  /** Wrapped paragraph; returns the height used. */
  const para = (s: string, x: number, top: number, w: number, font: PDFFont, size: number, color = BLACK, lead = 1.38): number => {
    const lines = wrapText(s, font, size, w);
    lines.forEach((l, i) => text(l, x, top + i * size * lead, font, size, color));
    return lines.length * size * lead;
  };
  const tag = (s: string, x: number, top: number) => text(s.toUpperCase(), x, top, mono, 6.6, SOFT);

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    // Framed wordmark, 30 mm wide, top left.
    const s = (30 * MM) / FRAMED_VB.width;
    const ox = LEFT - FRAMED_VB.minX * s;
    const oy = PAGE_H - 12 * MM + FRAMED_VB.minY * s;
    for (const p of WORDMARK_PATHS) page.drawSvgPath(p, { x: ox, y: oy, scale: s, color: BLACK });
    for (const [rx, ry, rw, rh] of FRAME_RECTS) page.drawRectangle({ x: ox + rx * s, y: oy - (ry + rh) * s, width: rw * s, height: rh * s, color: BLACK });
    const [dx, dy, dw, dh] = WORDMARK_DOT_RECT;
    page.drawRectangle({ x: ox + dx * s, y: oy - (dy + dh) * s, width: dw * s, height: dh * s, color: RED });
    textRight(headerId, RIGHT, 14.5 * MM, mono, 7.5);
    y = 26 * MM;
  };

  /** Start a new page when the next block does not fit above the footer. */
  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - 20 * MM) newPage();
  };

  const section = (n: number, title: string, aside = '') => {
    y += 10;
    rule(y, LEFT, RIGHT, 1);
    y += 5;
    text(String(n), LEFT, y + 1.5, mono, 8, SOFT);
    text(title, LEFT + 5 * MM, y, bold, 11);
    if (aside) textRight(aside, RIGHT, y + 2.5, mono, 7, SOFT);
    y += 19;
  };

  /** Label/value rows; returns the height used. */
  const kv = (rows: [string, string][], x: number, top: number, w: number, labelW: number, valueFont: PDFFont, size = 9): number => {
    let h = 0;
    for (const [k, v] of rows) {
      text(k, x, top + h + 0.6, sans, 8, SOFT);
      h += Math.max(para(v, x + labelW, top + h, w - labelW, valueFont, size), size * 1.38) + 1.2;
    }
    return h;
  };

  // ───────────────────────────── page 1
  newPage();
  tag('Quotation', LEFT, y);
  y += 11;
  text(`Quotation ${d.no}`, LEFT, y, bold, 21);
  y += 30;
  if (d.intro) y += para(d.intro, LEFT, y, WIDTH, sans, 10, MUTED) + 6;

  const half = (WIDTH - 8 * MM) / 2;
  const rightX = LEFT + half + 8 * MM;
  tag('Quote details', LEFT, y);
  tag('Customer', rightX, y);
  y += 11;
  let leftH = kv(
    [['Quote no.', d.no], ['Date', d.date], ['Valid until', d.validUntil], ['Reference', d.reference || '—']],
    LEFT, y, half, 19 * MM, mono, 8.6,
  );
  const cust: [string, string][] = [['Customer', d.customer.name]];
  if (d.customer.contact) cust.push(['Contact', d.customer.contact]);
  if (d.customer.department) cust.push(['Department', d.customer.department]);
  if (d.customer.address?.length) cust.push(['Address', d.customer.address.join('\n')]);
  const rightH = kv(cust, rightX, y, half, 21 * MM, sans);
  leftH += 7;
  tag('Seller', LEFT, y + leftH);
  leftH += 11;
  leftH += kv([['Seller', d.seller.name], ['Address', d.seller.address.join('\n')], ['Contact', d.seller.email]], LEFT, y + leftH, half, 19 * MM, sans);
  y += Math.max(leftH, rightH);

  // 1 · items
  section(1, 'Quoted items', `${d.currency} · ${d.taxNote}`);
  const cols = [0, 0.055, 0.34, 0.6, 0.655, 0.775, 0.905].map((f) => LEFT + f * WIDTH);
  const colEnd = (i: number) => (i < cols.length - 1 ? cols[i + 1] : RIGHT) - (i === 5 ? 8 : 3);
  const heads = ['POS', 'PART NUMBER / DESCRIPTION', 'SPEC SUMMARY', 'QTY', `UNIT PRICE (${d.currency})`, `TOTAL (${d.currency})`, 'LEAD TIME'];
  const numeric = [false, false, false, true, true, true, false];
  let headH = 0;
  heads.forEach((h, i) => {
    const lines = wrapText(h, mono, 6.4, colEnd(i) - cols[i]);
    lines.forEach((l, j) => (numeric[i] ? textRight(l, colEnd(i), y + j * 8, mono, 6.4, SOFT) : text(l, cols[i], y + j * 8, mono, 6.4, SOFT)));
    headH = Math.max(headH, lines.length * 8);
  });
  y += headH + 3;
  rule(y, LEFT, RIGHT, 0.8);
  y += 5;
  d.items.forEach((it, idx) => {
    ensure(60);
    const top = y;
    let hDesc = 0;
    if (it.partNo) { text(it.partNo, cols[1], top, mono, 9); hDesc += 12.5; }
    hDesc += para(it.description, cols[1], top + hDesc, colEnd(1) - cols[1], sans, 8.5, MUTED);
    let hSpec = 0;
    if (it.option) { text('OPTION · NOT INCLUDED IN TOTAL', cols[2], top + 1, mono, 6.4, SOFT); hSpec += 10.5; }
    for (const s of it.spec ?? []) hSpec += para(s, cols[2], top + hSpec, colEnd(2) - cols[2], sans, 8.5, it.option ? MUTED : BLACK);
    text(String(idx + 1).padStart(2, '0'), cols[0], top, mono, 9);
    textRight(String(it.qty), colEnd(3), top, mono, 9);
    textRight(money(it.unitPrice), colEnd(4), top, mono, 9);
    textRight(money(it.qty * it.unitPrice), colEnd(5), top, mono, 9);
    const hLead = it.leadTime ? para(it.leadTime, cols[6], top, RIGHT - cols[6], sans, 8.5) : 0;
    y += Math.max(hDesc, hSpec, hLead, 12) + 5;
    rule(y - 2.5, LEFT, RIGHT, 0.4, HAIR);
  });

  // 2 · one-time charges and total
  ensure(150);
  section(2, 'One-time charges and total');
  const totals = offerTotals(d);
  const totalW = 0.36 * WIDTH;
  const nreW = WIDTH - totalW - 7 * MM;
  const totalX = RIGHT - totalW;
  const lines: [string, string][] = [['Items', money(totals.items)]];
  if (d.nre) lines.push(['One-time NRE', money(d.nre.price)]);
  if (d.shipping) lines.push([d.shipping.label, d.shipping.price === undefined ? 'quoted separately' : money(d.shipping.price)]);
  const totalLabel = wrapText(`Total, ${d.taxNote}`, bold, 9.5, totalW - 6 * MM - bold.widthOfTextAtSize(`${d.currency} ${money(totals.total)}`, 10.5) - 6);
  const blockH = 8 * MM + lines.length * 12 + 8 + Math.max(totalLabel.length * 12.5, 14) + 2 * MM;
  box(totalX, y, totalW, blockH, 1.4, BLACK);
  let ty = y + 2.6 * MM;
  tag('Quotation total', totalX + 3 * MM, ty);
  ty += 11;
  for (const [k, v] of lines) {
    text(k, totalX + 3 * MM, ty, sans, 8.5, SOFT);
    textRight(v, RIGHT - 3 * MM, ty, mono, 8.5);
    ty += 12;
  }
  ty += 2;
  rule(ty, totalX + 3 * MM, RIGHT - 3 * MM, 0.8);
  ty += 5;
  totalLabel.forEach((l, i) => text(l, totalX + 3 * MM, ty + i * 12.5, bold, 9.5));
  textRight(`${d.currency} ${money(totals.total)}`, RIGHT - 3 * MM, ty, bold, 10.5);
  box(LEFT, y, nreW, blockH, 0.7);
  tag(d.nre ? 'One-time NRE' : 'One-time charges', LEFT + 3 * MM, y + 2.6 * MM);
  if (d.nre) {
    const h = para(d.nre.description, LEFT + 3 * MM, y + 2.6 * MM + 11, nreW - 6 * MM - 26 * MM, sans, 10);
    if (d.nre.note) para(d.nre.note, LEFT + 3 * MM, y + 2.6 * MM + 13 + h, nreW - 6 * MM - 26 * MM, sans, 8.5, SOFT);
    textRight(money(d.nre.price), LEFT + nreW - 3 * MM, y + 2.6 * MM + 11, mono, 10);
  } else {
    text('None', LEFT + 3 * MM, y + 2.6 * MM + 11, sans, 10);
    para('No tooling or engineering charge applies to this quotation.', LEFT + 3 * MM, y + 2.6 * MM + 26, nreW - 6 * MM, sans, 8.5, SOFT);
  }
  y += blockH;

  // 3 · terms
  ensure(40 + d.terms.deliveryPayment.length * 30 + 40);
  section(3, 'Commercial terms');
  text('Delivery & payment', LEFT, y, bold, 10);
  const termsH = 15 + kv(d.terms.deliveryPayment, LEFT, y + 15, half, 19 * MM, sans, 8.8);
  let listH = 0;
  const list = (label: string, items: string[]) => {
    tag(label, rightX, y + listH);
    listH += 11;
    for (const s of items) {
      text('•', rightX + 1, y + listH, sans, 8.8);
      listH += para(s, rightX + 4 * MM, y + listH, half - 4 * MM, sans, 8.8) + 2;
    }
    listH += 5;
  };
  if (d.terms.included?.length) list('Included', d.terms.included);
  if (d.terms.options?.length) list('Options', d.terms.options);
  y += Math.max(termsH, listH) + 6;
  rule(y, LEFT, RIGHT, 0.5, HAIR);
  y += 5;
  y += para(`Validity. This quotation remains valid until ${d.validUntil}. Prices are in ${d.currency}, ${d.taxNote}.`, LEFT, y, WIDTH, sans, 8.6, MUTED);

  // ───────────────────────────── page 2
  newPage();
  y -= 10;
  section(4, 'Technical annex', d.annex.reference ?? '');
  const specCols = d.annex.specs.length > 6 ? 2 : 1;
  const perCol = Math.ceil(d.annex.specs.length / specCols);
  const specW = specCols === 2 ? half : WIDTH;
  const colHeights = [0, 0];
  d.annex.specs.forEach(([k, v], i) => {
    const c = Math.floor(i / perCol);
    const x = c === 0 ? LEFT : rightX;
    const top = y + colHeights[c];
    text(k, x, top, sans, 7.2, SOFT);
    const h = para(v, x, top + 9.5, specW, mono, 8.4);
    rule(top + 9.5 + h + 2.5, x, x + specW, 0.4, HAIR);
    colHeights[c] += 9.5 + h + 6.5;
  });
  y += Math.max(...colHeights) + 4;
  if (d.annex.notes?.length) {
    const n = d.annex.notes.length;
    const w = (WIDTH - (n - 1) * 8 * MM) / n;
    const hs = d.annex.notes.map(([, v]) => wrapText(v, sans, 8.8, w - 6 * MM).length * 8.8 * 1.38);
    const h = Math.max(...hs) + 11 + 6 * MM;
    d.annex.notes.forEach(([k, v], i) => {
      const x = LEFT + i * (w + 8 * MM);
      box(x, y, w, h);
      tag(k, x + 3 * MM, y + 2.6 * MM);
      para(v, x + 3 * MM, y + 2.6 * MM + 11, w - 6 * MM, sans, 8.8);
    });
    y += h;
  }

  // 5 · acceptance, anchored to the bottom of the page
  const signH = 49 * MM;
  ensure(signH + 70);
  y = Math.max(y, PAGE_H - 22 * MM - signH - 62);
  section(5, 'Acceptance and order release');
  y += para(
    'To accept this quotation, return this page with the customer acceptance fields completed, or confirm the order through the link in the accompanying email. Purchase order details confirm quantities and delivery instructions.',
    LEFT, y, WIDTH, sans, 9, MUTED,
  ) + 8;
  const oursW = (WIDTH - 8 * MM) * 0.43;
  const theirsX = LEFT + oursW + 8 * MM;
  const theirsW = RIGHT - theirsX;
  box(LEFT, y, oursW, signH);
  tag('Calib.Tools quotation authorization', LEFT + 3 * MM, y + 3 * MM);
  rule(y + 17 * MM, LEFT + 3 * MM, LEFT + oursW - 3 * MM, 0.8);
  text('Signature', LEFT + 3 * MM, y + 13.5 * MM, mono, 7, SOFT);
  const meta: [string, string][] = [['Name', d.signatory.name], ['Title', d.signatory.title], ['Date', d.date], ['Quote no.', d.no]];
  meta.forEach(([k, v], i) => {
    const x = LEFT + 3 * MM + (i % 2) * (oursW / 2 - 1 * MM);
    const top = y + 21 * MM + Math.floor(i / 2) * 12 * MM;
    text(k, x, top, sans, 8, SOFT);
    para(v, x, top + 11, oursW / 2 - 5 * MM, mono, 8);
  });
  box(theirsX, y, theirsW, signH);
  tag(`Customer acceptance · ${d.customer.name}`.slice(0, 70), theirsX + 3 * MM, y + 3 * MM);
  const field = (label: string, x: number, top: number, w: number) => {
    rule(top + 7.4 * MM, x, x + w, 0.8);
    text(label, x, top + 4.2 * MM, mono, 7, SOFT);
  };
  const fw = (theirsW - 6 * MM - 4 * MM) / 2;
  field('Name (print)', theirsX + 3 * MM, y + 8 * MM, fw);
  field('Title', theirsX + 3 * MM + fw + 4 * MM, y + 8 * MM, fw);
  field('Date', theirsX + 3 * MM, y + 18 * MM, fw);
  field('PO no.', theirsX + 3 * MM + fw + 4 * MM, y + 18 * MM, fw);
  field('Authorized signature', theirsX + 3 * MM, y + 30 * MM, theirsW - 6 * MM);

  // footer and watermark on every page
  pages.forEach((pg, i) => {
    page = pg;
    rule(PAGE_H - 15 * MM, LEFT, RIGHT, 0.5, HAIR);
    text(CONTACT_LINE, LEFT, PAGE_H - 12.5 * MM, sans, 7.5, SOFT);
    textRight(`Page ${i + 1} / ${pages.length}`, RIGHT, PAGE_H - 12.5 * MM, mono, 7.5, SOFT);
    if (d.watermark) {
      const size = 110;
      const w = bold.widthOfTextAtSize(d.watermark, size);
      const a = (35 * Math.PI) / 180;
      pg.drawText(d.watermark, {
        x: PAGE_W / 2 - (w / 2) * Math.cos(a) + (size * 0.35) * Math.sin(a),
        y: PAGE_H / 2 - (w / 2) * Math.sin(a) - (size * 0.35) * Math.cos(a),
        font: bold, size, color: BLACK, opacity: 0.055,
        rotate: { type: 'degrees', angle: 35 } as any,
      });
    }
  });

  return doc.save();
}
