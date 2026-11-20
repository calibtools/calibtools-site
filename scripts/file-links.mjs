/**
 * Links to files (datasheets, ready-made patterns, drawings) open in a new tab, so the page the
 * visitor is reading stays where it is. One rule, used by the Markdown pipeline (rehype plugin),
 * by the post-build link check and by the tests.
 */
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const FILE_LINK_RE = /\.(pdf|zip|dxf|step|stp|stl|svg|csv|ya?ml|json|xml|txt)(?:[?#].*)?$/i;

/** True for a link whose target is a file rather than a page. mailto:, anchors and pages are not. */
export function isFileLink(href) {
  if (typeof href !== 'string' || href === '' || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return false;
  return FILE_LINK_RE.test(href);
}

/** "PDF", "ZIP" … for the hint read by screen readers. */
export function fileKind(href) {
  return (FILE_LINK_RE.exec(href ?? '')?.[1] ?? '').toUpperCase().replace('YML', 'YAML');
}

/** Size of a site file as shown to visitors: "15 KB", "1.2 MB"; '' when the file is not ours or is missing. */
export function fileSizeLabel(href, publicDir = 'public') {
  if (typeof href !== 'string' || !href.startsWith('/')) return '';
  const p = join(publicDir, decodeURIComponent(href.split(/[?#]/)[0]));
  if (!existsSync(p)) return '';
  const bytes = statSync(p).size;
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** What a screen reader hears after the link text: file type, size, and that a new tab opens. */
export function fileLinkHint(href, publicDir = 'public') {
  return ` (${[fileKind(href), fileSizeLabel(href, publicDir), 'opens in a new tab'].filter(Boolean).join(', ')})`;
}

/**
 * rehype plugin: every <a> to a file gets target="_blank" rel="noopener" and a hint for screen readers,
 * unless it already downloads.
 */
export function rehypeFileLinks() {
  const visit = (node) => {
    if (node.type === 'element' && node.tagName === 'a') {
      const p = node.properties ?? (node.properties = {});
      if (isFileLink(p.href) && p.download === undefined && p.target !== '_blank') {
        p.target = '_blank';
        const rel = new Set(Array.isArray(p.rel) ? p.rel : typeof p.rel === 'string' ? p.rel.split(/\s+/) : []);
        rel.add('noopener');
        p.rel = [...rel].filter(Boolean);
        (node.children ?? (node.children = [])).push({
          type: 'element', tagName: 'span', properties: { className: ['sr-only'] },
          children: [{ type: 'text', value: fileLinkHint(p.href) }],
        });
      }
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  return (tree) => visit(tree);
}

/** File links in built HTML that would replace the current page: no target="_blank" and no download attribute. */
export function sameTabFileLinks(html) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*>/g)) {
    const tag = m[0];
    const href = /\shref="([^"]*)"/.exec(tag)?.[1];
    if (!isFileLink(href)) continue;
    if (/\starget="_blank"/.test(tag) || /\sdownload(?:[=\s>])/.test(tag)) continue;
    out.push(href);
  }
  return out;
}
