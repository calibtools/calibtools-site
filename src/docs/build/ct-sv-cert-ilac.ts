/**
 * CT-SV-CERT-ILAC  Service description builder (2 pages).
 *
 * Page 1: What you get · certification hierarchy table · How to order
 * Page 2: Scope (what is measured) · Recalibration · Notes · Revision history
 *         + push footer with disclaimer + QR block
 *
 * Reads docs/datasheets/CT-SV-CERT-ILAC.md and builds a simple
 * service-description document (no board rendering).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Doc,
  section,
  p,
  table,
  note,
  qr_block,
  type RenderResult,
} from '../ctdoc';
import { parseFrontMatter } from './ct-ds';

// ── Markdown helpers (local) ─────────────────────────────────────────

function extractSection(body: string, heading: string): string | null {
  const re = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  const start = body.search(re);
  if (start < 0) return null;
  const afterHeading = body.slice(start + heading.length);
  const nextH2 = afterHeading.search(/^## /m);
  return nextH2 >= 0 ? afterHeading.slice(0, nextH2) : afterHeading;
}

function parseMarkdownTable(block: string): { headers: string[]; rows: string[][] } | null {
  const lines = block.trim().split('\n').filter((l) => l.includes('|'));
  if (lines.length < 2) return null;
  const parse = (line: string) => {
    const placeholder = '\x00PIPE\x00';
    const safe = line.replace(/\\\|/g, placeholder);
    const cells = safe.split('|').map((c) => c.trim().replaceAll(placeholder, '|')).filter((_, i, arr) => i > 0 && i < arr.length);
    while (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
    return cells;
  };
  const headers = parse(lines[0]);
  const dataLines = lines.slice(1).filter((l) => !l.match(/^\s*\|[\s-:|]+\|\s*$/));
  return { headers, rows: dataLines.map(parse) };
}

function mono(text: string): string {
  return text.replace(/`([^`]+)`/g, '<span class="mono">$1</span>');
}

// ── Builder ──────────────────────────────────────────────────────────

export async function buildILACCert(opts: {
  code: string;
  outBase: string;
  watermark?: string;
}): Promise<RenderResult> {
  const { outBase, watermark } = opts;

  const mdPath = resolve(process.cwd(), 'docs/datasheets/CT-SV-CERT-ILAC.md');
  const md = readFileSync(mdPath, 'utf-8');
  const { meta, body } = parseFrontMatter(md);
  const FILE_URL = 'https://calib.tools/files/CT-SV-CERT-ILAC';

  const d = new Doc(
    'CT-SV-CERT-ILAC', meta.rev, meta.date,
    'Service description',
    'ILAC-MRA certificate',
    undefined, undefined, watermark,
  );

  // ── Page 1: What you get · cert hierarchy · How to order ────────

  let page1 = '';
  let secN = 1;

  // "What you get" section — two paragraphs
  const whatSection = extractSection(body, '## What you get');
  if (whatSection) {
    page1 += section(secN, 'What you get');
    const paras = whatSection.trim().split('\n\n').filter((s) => s.trim());
    for (const para of paras) {
      page1 += p(mono(para.replace(/\n/g, ' ').trim()));
    }
    secN++;
  }

  // Certification hierarchy table (three levels)
  const certLevels = table(
    [['Level', 't'], ['Document', 't'], ['Issued by', 't']],
    [
      [
        'Factory inspection',
        '<span class="mono">CT-IR-&lt;SN&gt;</span> · included with every target',
        'Calib.Tools (manufacturer)',
      ],
      [
        'ILAC-MRA certificate',
        '<span class="mono">SVC-X-CERT-ILAC</span> · add-on service',
        'CNAS-accredited laboratory',
      ],
      [
        'DAkkS certificate',
        'On request for specific requirements',
        'DAkkS-accredited laboratory',
      ],
    ],
    '', undefined, ['20%', '45%', '35%'],
  );
  page1 += section(secN, 'Certification hierarchy');
  page1 += certLevels;
  secN++;

  // "How to order" section
  const orderSection = extractSection(body, '## How to order');
  if (orderSection) {
    page1 += section(secN, 'How to order');
    const paras = orderSection.trim().split('\n\n').filter((s) => s.trim());
    for (const para of paras) {
      page1 += p(mono(para.replace(/\n/g, ' ').trim()));
    }
    secN++;
  }

  d.addPage(page1);

  // ── Page 2: Scope · Recalibration · Notes · Revision history ────

  let page2 = '';

  // Scope table (what is measured)
  const scopeSection = extractSection(body, '## Scope');
  if (scopeSection) {
    const tbl = parseMarkdownTable(scopeSection);
    if (tbl) {
      page2 += section(secN, 'What is measured');
      page2 += table(
        [['Feature', 't'], ['Detail', 't']],
        tbl.rows.map((r) => [mono(r[0] ?? ''), mono(r[1] ?? '')]),
        '', undefined, ['28%', '72%'],
      );
      secN++;
    }
  }

  // Recalibration
  const recalSection = extractSection(body, '## Recalibration');
  if (recalSection) {
    page2 += section(secN, 'Recalibration');
    page2 += p(mono(recalSection.trim().replace(/\n/g, ' ')));
    secN++;
  }

  // Notes
  const notesSection = extractSection(body, '## Notes');
  if (notesSection) {
    page2 += section(secN, 'Notes');
    const items = notesSection.trim().split('\n')
      .filter((l) => l.trim().startsWith('-'))
      .map((l) => `<li>${mono(l.replace(/^[-*]\s+/, '').trim())}</li>`)
      .join('');
    if (items) {
      page2 += `<ul class="l">${items}</ul>`;
    }
    secN++;
  }

  // Revision history
  const revSection = extractSection(body, '## Revision history');
  if (revSection) {
    const tbl = parseMarkdownTable(revSection);
    if (tbl) {
      page2 += section(secN, 'Revision history');
      page2 += table(
        [['Rev', 'm'], ['Date', 'm'], ['Change', 't']],
        tbl.rows,
        '', undefined, ['13%', '23%', '64%'],
      );
    }
  }

  // Push footer: disclaimer + QR block
  page2 += `<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end;border-top:.25mm solid #b3b3b3;padding-top:4mm">`;
  page2 += note('Service terms subject to change; current revision at calib.tools.');
  page2 += `${qr_block(FILE_URL, 15)}</div>`;

  d.addPage(page2);

  return d.render(outBase);
}
