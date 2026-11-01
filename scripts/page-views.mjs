#!/usr/bin/env node
/**
 * page-views.mjs — query Analytics Engine for page-view counts.
 *
 * Requires env vars:
 *   CF_ACCOUNT_ID  — Cloudflare account ID
 *   CF_API_TOKEN   — API token with Analytics Engine read scope
 *
 * Usage:
 *   pnpm page-views              # last 28 days (default)
 *   pnpm page-views --days 7     # last 7 days
 */

const DATASET = 'calibtools_page_views';
const DEFAULT_DAYS = 28;

const accountId = process.env.CF_ACCOUNT_ID;
const apiToken = process.env.CF_API_TOKEN;

if (!accountId || !apiToken) {
  console.error('Missing CF_ACCOUNT_ID or CF_API_TOKEN environment variables.');
  process.exit(1);
}

const daysArg = process.argv.indexOf('--days');
const days = daysArg !== -1 && process.argv[daysArg + 1]
  ? parseInt(process.argv[daysArg + 1], 10)
  : DEFAULT_DAYS;

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;

async function query(sql) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'text/plain',
    },
    body: sql,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`API error ${res.status}: ${text}`);
    process.exit(1);
  }
  return res.json();
}

// ── Table 1: views per path ──
console.log(`\n📊 Page views — last ${days} days\n`);

const viewsByPath = await query(`
  SELECT
    blob1 AS path,
    SUM(_sample_interval) AS views
  FROM ${DATASET}
  WHERE timestamp > NOW() - INTERVAL '${days}' DAY
  GROUP BY path
  ORDER BY views DESC
`);

if (viewsByPath.data?.length) {
  console.log('  ' + 'Path'.padEnd(55) + 'Views');
  console.log('  ' + '-'.repeat(65));
  for (const row of viewsByPath.data) {
    console.log(`  ${String(row.path).padEnd(55)}${row.views}`);
  }
} else {
  console.log('  (no data)');
}

// ── Table 2: views per (target path, referrer category) ──
console.log(`\n📊 Target pages by referrer category — last ${days} days\n`);

const targetsByRef = await query(`
  SELECT
    blob1 AS path,
    blob2 AS referrer_category,
    SUM(_sample_interval) AS views
  FROM ${DATASET}
  WHERE timestamp > NOW() - INTERVAL '${days}' DAY
    AND blob1 LIKE '/targets/%'
  GROUP BY path, referrer_category
  ORDER BY path, views DESC
`);

if (targetsByRef.data?.length) {
  console.log('  ' + 'Target path'.padEnd(45) + 'Category'.padEnd(15) + 'Views');
  console.log('  ' + '-'.repeat(70));
  for (const row of targetsByRef.data) {
    console.log(`  ${String(row.path).padEnd(45)}${String(row.referrer_category).padEnd(15)}${row.views}`);
  }
} else {
  console.log('  (no data)');
}

console.log('');
