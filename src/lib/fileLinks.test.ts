/**
 * DL-1 — a link to a file opens in a new tab; the page the visitor is reading is not replaced.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isFileLink, rehypeFileLinks, sameTabFileLinks, unhintedFileLinks, fileKind, fileSizeLabel, fileLinkHint } from '../../scripts/file-links.mjs';
import { newTabHint } from '../../scripts/new-tab-hint.mjs';

const ROOT = resolve(import.meta.dirname, '../..');

describe('isFileLink', () => {
  it('recognizes files by extension', () => {
    for (const h of ['/files/datasheets/CT-DS-CHA-C.pdf', '/files/patterns/a.PDF', 'https://calib.tools/q/abc/key.pdf', '/x/board.dxf', '/x/board.step', '/x/config.yaml?v=2', '/x/pack.zip#top']) {
      expect(isFileLink(h), h).toBe(true);
    }
  });
  it('leaves pages, anchors and mail links alone', () => {
    for (const h of ['/tools/generator/', '/files/', '#specs', 'mailto:hello@calib.tools', '/calibacademy/pdf-printing/', '', undefined]) {
      expect(isFileLink(h as string), String(h)).toBe(false);
    }
  });
});

describe('rehypeFileLinks', () => {
  const a = (properties: Record<string, unknown>) => ({ type: 'element', tagName: 'a', properties, children: [] });
  it('opens file links in a new tab and keeps page links as they are', () => {
    const file = a({ href: '/files/patterns/x.pdf' });
    const page = a({ href: '/tools/generator/' });
    const dl = a({ href: '/files/x.zip', download: '' });
    const tree = { type: 'root', children: [{ type: 'element', tagName: 'p', properties: {}, children: [file, page, dl] }] };
    rehypeFileLinks()(tree);
    expect(file.properties).toMatchObject({ target: '_blank', rel: ['noopener'] });
    expect(page.properties.target).toBeUndefined();
    expect(dl.properties.target).toBeUndefined();
  });
  it('keeps an existing rel value', () => {
    const file = a({ href: '/x.pdf', rel: ['nofollow'] });
    rehypeFileLinks()({ type: 'root', children: [file] });
    expect(file.properties.rel).toEqual(['nofollow', 'noopener']);
  });
});

describe('hint for screen readers', () => {
  it('names the file type and size and says a new tab opens', () => {
    expect(fileKind('/a/b.pdf')).toBe('PDF');
    expect(fileSizeLabel('/files/datasheets/CT-DS-CHA-C.pdf', join(ROOT, 'public'))).toMatch(/^\d+ KB$/);
    expect(fileSizeLabel('/nope.pdf', join(ROOT, 'public'))).toBe('');
    expect(fileLinkHint('/files/datasheets/CT-DS-CHA-C.pdf', join(ROOT, 'public'))).toMatch(/^ \(PDF, \d+ KB, opens in a new tab\)$/);
    expect(fileLinkHint('https://example.com/x.pdf')).toBe(' (PDF, opens in a new tab)');
  });
  it('is appended to Markdown file links as hidden text', () => {
    const file = { type: 'element', tagName: 'a', properties: { href: 'https://example.com/x.pdf' }, children: [{ type: 'text', value: 'A4' }] };
    rehypeFileLinks()({ type: 'root', children: [file] });
    expect(file.children).toHaveLength(2);
    expect(file.children[1]).toMatchObject({ tagName: 'span', properties: { className: ['sr-only'] } });
  });
});

describe('unhintedFileLinks', () => {
  it('reports new-tab file links that screen readers are not told about', () => {
    const html = [
      '<a href="/a.pdf" target="_blank" rel="noopener">datasheet</a>',
      '<a href="/b.pdf" target="_blank" rel="noopener">datasheet<span class="sr-only"> (PDF, opens in a new tab)</span></a>',
      '<a href="/c.pdf" target="_blank" aria-label="Datasheet (PDF, opens in a new tab)">x</a>',
      '<a href="/d.pdf" download>x</a>',
      '<a href="/e.pdf" target="_blank" aria-hidden="true" tabindex="-1"><img src="/e.webp" alt=""></a>',
      '<a href="https://example.com/" target="_blank">page</a>',
    ].join('');
    expect(unhintedFileLinks(html)).toEqual(['/a.pdf']);
  });
  it('islands use the same wording as pages', () => {
    expect(newTabHint('PDF')).toBe(fileLinkHint('https://example.com/x.pdf'));
    expect(newTabHint()).toBe(' (opens in a new tab)');
  });
});

describe('sameTabFileLinks', () => {
  it('reports only file links without a new tab or a download attribute', () => {
    const html = '<a href="/a.pdf">x</a><a href="/b.pdf" target="_blank" rel="noopener">x</a><a href="/c.zip" download>x</a><a href="/page/">x</a>';
    expect(sameTabFileLinks(html)).toEqual(['/a.pdf']);
  });
});

describe('source', () => {
  it('registers the plugin for Markdown and runs the check after the build', () => {
    expect(readFileSync(join(ROOT, 'astro.config.mjs'), 'utf-8')).toContain('rehypeFileLinks');
    expect(readFileSync(join(ROOT, 'scripts/check-links.mjs'), 'utf-8')).toContain('sameTabFileLinks');
    expect(readFileSync(join(ROOT, 'scripts/check-links.mjs'), 'utf-8')).toContain('unhintedFileLinks');
  });
  it('islands that link to a quotation or datasheet in a new tab add the hidden hint', () => {
    for (const f of ['src/islands/PurchaseTable.tsx', 'src/islands/AccountPanel.tsx', 'src/islands/OrderDetail.tsx']) {
      const src = readFileSync(join(ROOT, f), 'utf-8');
      const pdfLinks = [...src.matchAll(/<a\b[^>]*href=\{[^}]*(?:pdf|docsUrl)[^}]*\}[^>]*target="_blank"[^>]*>([\s\S]*?)<\/a>/g)];
      expect(pdfLinks.length, f).toBeGreaterThan(0);
      for (const m of pdfLinks) expect(m[1], f).toContain('newTabHint(');
    }
  });
  it('built pages have no file link that replaces the page', () => {
    const dist = join(ROOT, 'dist');
    if (!existsSync(dist)) return;
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.html')) for (const h of sameTabFileLinks(readFileSync(p, 'utf-8'))) bad.push(`${p.slice(dist.length)} → ${h}`);
      }
    };
    walk(dist);
    expect(bad).toEqual([]);
  });
});
