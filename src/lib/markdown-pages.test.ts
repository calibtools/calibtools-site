import { describe, it, expect } from 'vitest';
import { mainHtml, pageMarkdown, markdownPath } from '../../scripts/markdown-pages.mjs';
import { wantsMarkdown } from '../../functions/_middleware';

const page = `<html><head><title>ChArUco board · Calib.Tools</title></head><body>
<header><nav><a href="/">Home</a></nav></header>
<main>
  <div><a href="/tools/fov/" title="FOV &#38; resolution calculator">FOV</a></div>
  <h1><svg viewBox="0 0 1 1"></svg>ChArUco board, aluminum</h1>
  <a href="#reviews">Reviews</a> <a href="/faq/">FAQ</a>
  <header><p>Every corner carries a marker ID.</p></header>
  <pre><code># (cols, rows) in meters</code></pre>
  <p>Rigid board for <a href="/guides/charuco-vs-checkerboard-vs-aprilgrid/">ChArUco</a> calibration.</p>
  <script>console.log('x')</script><style>.a{}</style>
  <svg viewBox="0 0 1 1"><path d="M0 0"/></svg>
  <button type="button">Add to cart</button>
  <form><h2>Pattern</h2><label>Rows <input name="q"></label><select><option>DICT_6X6_250</option></select></form>
  <table><tr><th>Size</th><th>Tolerance</th></tr><tr><td>400 × 300 mm</td><td>±0.3 mm</td></tr></table>
  <img src="/a.webp" alt="Board on a bench">
</main>
<footer>© Calib.Tools</footer></body></html>`;

describe('Markdown versions of pages', () => {
  it('takes only <main>, without scripts, styles, drawings, buttons or forms', () => {
    const m = mainHtml(page);
    expect(m).toContain('ChArUco board, aluminum</h1>');
    for (const gone of ['<script', '<style', '<svg', '<button', '<input', '<select', '<nav']) expect(m).not.toContain(gone);
  });

  it('turns the page into Markdown with absolute links, tables, the source URL and the update date', () => {
    const md = pageMarkdown(page, { url: 'https://calib.tools/targets/charuco-composite/', lastmod: '2026-11-18' });
    expect(md.startsWith('# ChArUco board, aluminum\n')).toBe(true);
    expect(md).toContain('Source: https://calib.tools/targets/charuco-composite/');
    expect(md).toContain('Last updated: 2026-11-18');
    expect(md).toContain('[ChArUco](https://calib.tools/guides/charuco-vs-checkerboard-vs-aprilgrid/)');
    expect(md).toContain('| Size | Tolerance |');
    expect(md).toContain('| 400 × 300 mm | ±0.3 mm |');
    expect(md).not.toMatch(/Add to cart|console\.log|Home\]|© Calib/);
    expect(md).toContain('Board on a bench');
    expect(md).toContain('[FOV & resolution calculator](https://calib.tools/tools/fov/)');
    expect(md).toContain('[Reviews](https://calib.tools/targets/charuco-composite/#reviews)');
    expect(md).toContain('FAQ <https://calib.tools/faq/>');
    expect(md).toContain('Every corner carries a marker ID.');
    expect(md).toContain('## Pattern');
    expect(md).not.toContain('DICT_6X6_250');
    expect(md.split('\n').filter((l) => l === '# ChArUco board, aluminum')).toHaveLength(1);
    expect(md).toContain('```\n# (cols, rows) in meters\n```');
  });

  it('writes index.md next to index.html', () => {
    expect(markdownPath('https://calib.tools/')).toBe('index.md');
    expect(markdownPath('https://calib.tools/tools/generator/charuco/')).toBe('tools/generator/charuco/index.md');
  });

  it('serves Markdown only when the request asks for it before HTML', () => {
    const req = (accept: string, path = '/targets/charuco-composite/') =>
      new Request(`https://calib.tools${path}`, { headers: { accept } });
    expect(wantsMarkdown(req('text/markdown'))).toBe(true);
    expect(wantsMarkdown(req('text/markdown, text/html;q=0.9'))).toBe(true);
    expect(wantsMarkdown(req('text/html,application/xhtml+xml,*/*;q=0.8'))).toBe(false);
    expect(wantsMarkdown(req('text/html, text/markdown;q=0.5'))).toBe(false);
    expect(wantsMarkdown(req('*/*'))).toBe(false);
    expect(wantsMarkdown(req('text/markdown', '/files/a.pdf'))).toBe(false);
    expect(wantsMarkdown(req('text/markdown', '/api/geo'))).toBe(false);
  });
});
