#!/usr/bin/env node
/**
 * indexnow.mjs — tell Bing (and the other IndexNow engines) which pages changed.
 * Reads the live sitemap, picks URLs whose <lastmod> falls in the window, and posts them to IndexNow.
 * The key is public by design: it is served at https://calib.tools/<key>.txt so engines can check it.
 *
 *   node scripts/indexnow.mjs              # pages changed in the last 2 days
 *   node scripts/indexnow.mjs --days=7
 *   node scripts/indexnow.mjs --all        # every URL in the sitemap (first run)
 *   node scripts/indexnow.mjs --dry-run    # print, do not send
 * Run daily by .github/workflows/indexnow.yml.
 */
import { pathToFileURL } from 'node:url';

export const INDEXNOW_KEY = '3f0292f0fe162f03ed317a9796bdad7c';
const HOST = 'calib.tools';
const SITEMAP = `https://${HOST}/sitemap-index.xml`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

export function sitemapEntries(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, u]) => ({
    loc: (/<loc>\s*([^<\s]+)\s*<\/loc>/.exec(u) ?? [])[1],
    lastmod: (/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(u) ?? [])[1] ?? null,
  })).filter((e) => e.loc);
}

export function sitemapIndexChildren(xml) {
  return [...xml.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>[\s\S]*?<\/sitemap>/g)].map((m) => m[1]);
}

/** Pages changed in the last `days` days (by lastmod), or every page with `all`. */
export function urlsToSubmit(entries, { days = 2, all = false, now = new Date() } = {}) {
  if (all) return entries.map((e) => e.loc);
  const since = now.getTime() - days * 86_400_000;
  return entries.filter((e) => e.lastmod && Date.parse(e.lastmod) >= since).map((e) => e.loc);
}

export function payload(urls) {
  return {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
    urlList: urls.filter((u) => new URL(u).hostname === HOST).slice(0, 10_000),
  };
}

async function text(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'calib.tools indexnow (+https://calib.tools/)' } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const dry = args.includes('--dry-run');
  const days = Number((args.find((a) => a.startsWith('--days=')) ?? '--days=2').split('=')[1]);
  const index = await text(SITEMAP);
  const children = sitemapIndexChildren(index);
  const entries = (await Promise.all((children.length ? children : [SITEMAP]).map(text))).flatMap(sitemapEntries);
  const body = payload(urlsToSubmit(entries, { days, all }));
  console.log(`[indexnow] ${entries.length} URLs in the sitemap, ${body.urlList.length} to submit${all ? ' (all)' : ` (changed in ${days} days)`}`);
  for (const u of body.urlList) console.log(`  ${u}`);
  if (body.urlList.length === 0 || dry) process.exit(0);
  const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
  console.log(`[indexnow] ${ENDPOINT} → ${r.status} ${r.statusText}`);
  // 200 OK and 202 Accepted are success; anything else fails the run so it shows up in Actions
  if (r.status !== 200 && r.status !== 202) process.exit(1);
}
