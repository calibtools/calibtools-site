#!/usr/bin/env node
/**
 * check-domain-verification.mjs — postbuild check.
 * The built home page must carry Meta's domain verification tag inside <head>, with the exact
 * content value. Meta reads the static HTML of https://calib.tools/ and does not run scripts.
 * Meta 域名验证，2026-11-17，对应 Meta 平台 Calib.Tools，不要删除。
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const META_DOMAIN_VERIFICATION = 'medo5c43zaicq35r04c4dvhq07g9ei';

/** Returns null when the tag is in <head> with the exact value, otherwise the reason it is not. */
export function domainVerificationProblem(html) {
  const end = html.indexOf('</head>');
  if (end < 0) return 'no </head> in the page';
  const head = html.slice(0, end);
  const tags = [...head.matchAll(/<meta\s[^>]*name=["']facebook-domain-verification["'][^>]*>/g)].map((m) => m[0]);
  if (tags.length === 0) {
    return html.includes('facebook-domain-verification') ? 'the tag is outside <head>' : 'the tag is missing';
  }
  if (tags.length > 1) return `the tag appears ${tags.length} times in <head>`;
  const content = /content=["']([^"']*)["']/.exec(tags[0])?.[1];
  if (content !== META_DOMAIN_VERIFICATION) return `content is "${content}", expected "${META_DOMAIN_VERIFICATION}"`;
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const file = resolve(process.env.CHECK_SEO_DIST || 'dist', 'index.html');
  if (!existsSync(file)) {
    console.error(`[check-domain-verification] ${file} not found. Run the build first.`);
    process.exit(1);
  }
  const problem = domainVerificationProblem(readFileSync(file, 'utf-8'));
  if (problem) {
    console.error(`[check-domain-verification] FAIL — home page: ${problem}`);
    process.exit(1);
  }
  console.log('[check-domain-verification] OK — Meta domain verification tag is in the home page <head>.');
}
