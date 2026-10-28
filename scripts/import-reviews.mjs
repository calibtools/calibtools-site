#!/usr/bin/env node
/**
 * Import reviews from an Excel file into Cloudflare KV.
 *
 * Usage:
 *   node scripts/import-reviews.mjs --file <xlsx> [--dry-run] [--batch <name>]
 *
 * Validates every row before writing anything. Re-running the same file is a no-op
 * (de-duplicates on product_handle + reviewer_name + date + body hash).
 *
 * Env: CF_ACCOUNT_ID, CF_KV_REVIEWS_NAMESPACE_ID, CF_API_TOKEN, CF_DEPLOY_HOOK
 *      PUBLIC_SHOPIFY_DOMAIN, PUBLIC_SHOPIFY_STOREFRONT_TOKEN
 */

import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// ── Args ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const FILE = getArg('--file');
const BATCH = getArg('--batch') || new Date().toISOString().slice(0, 10);

if (!FILE) {
  console.error('Usage: node scripts/import-reviews.mjs --file <xlsx> [--dry-run] [--batch <name>]');
  process.exit(1);
}

// ── Env ───────────────────────────────────────────────────────────────

try {
  const envFile = readFileSync('.env', 'utf-8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
} catch { /* no .env */ }

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_KV_NS = process.env.CF_KV_REVIEWS_NAMESPACE_ID;
const CF_TOKEN = process.env.CF_API_TOKEN;
const DEPLOY_HOOK = process.env.CF_DEPLOY_HOOK;
const SHOPIFY_DOMAIN = process.env.PUBLIC_SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

if (!DRY_RUN && (!CF_ACCOUNT_ID || !CF_KV_NS || !CF_TOKEN)) {
  console.error('Missing env: CF_ACCOUNT_ID, CF_KV_REVIEWS_NAMESPACE_ID, CF_API_TOKEN');
  process.exit(1);
}

const KV_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NS}`;
const headers = { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' };

const VALID_CONNECTIONS = ['none', 'free_sample', 'discount', 'insider'];

// ── Storefront product-handle check ───────────────────────────────────

const handleCache = new Map();

async function handleExists(handle) {
  if (handleCache.has(handle)) return handleCache.get(handle);

  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    // Can't verify — accept it (dry-run without Shopify creds)
    if (DRY_RUN) { handleCache.set(handle, true); return true; }
    console.error('Missing PUBLIC_SHOPIFY_DOMAIN or PUBLIC_SHOPIFY_STOREFRONT_TOKEN');
    process.exit(1);
  }

  const query = `{ productByHandle(handle: "${handle}") { id } }`;
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  const exists = !!data?.data?.productByHandle?.id;
  handleCache.set(handle, exists);
  return exists;
}

// ── De-duplication key ────────────────────────────────────────────────

function dedupKey(handle, reviewerName, date, body) {
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 16);
  return `${handle}:${reviewerName}:${date}:${hash}`;
}

async function getExistingDedupKeys() {
  if (DRY_RUN && (!CF_ACCOUNT_ID || !CF_KV_NS || !CF_TOKEN)) return new Set();

  const keys = new Set();
  const listUrl = `${KV_BASE}/keys?prefix=review:`;
  const res = await fetch(listUrl, { headers });
  if (!res.ok) return keys;

  const data = await res.json();
  for (const entry of data.result || []) {
    const valRes = await fetch(`${KV_BASE}/values/${encodeURIComponent(entry.name)}`, { headers });
    if (!valRes.ok) continue;
    const review = await valRes.json();
    if (review.handle && review.author?.initials && review.created && review.body) {
      const dateStr = review.created.slice(0, 10);
      keys.add(dedupKey(review.handle, review.author.initials, dateStr, review.body));
    }
  }
  return keys;
}

// ── Parse and validate ────────────────────────────────────────────────

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  const ws = wb.getWorksheet('reviews');
  if (!ws) {
    console.error('Sheet "reviews" not found in the file.');
    process.exit(1);
  }

  const headerRow = ws.getRow(1);
  const colMap = {};
  headerRow.eachCell((cell, colNum) => {
    colMap[String(cell.value).trim()] = colNum;
  });

  const required = [
    'product_handle', 'rating', 'title', 'body', 'reviewer_name',
    'date', 'consent', 'material_connection',
  ];
  const missingCols = required.filter((c) => !(c in colMap));
  if (missingCols.length) {
    console.error(`Missing columns: ${missingCols.join(', ')}`);
    process.exit(1);
  }

  function cell(row, col) {
    const v = row.getCell(colMap[col])?.value;
    if (v == null) return '';
    // ExcelJS date objects
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).trim();
  }

  const rows = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // header
    const handle = cell(row, 'product_handle');
    if (!handle) return; // skip empty rows

    const rating = Number(cell(row, 'rating'));
    const title = cell(row, 'title');
    const body = cell(row, 'body');
    const reviewerName = cell(row, 'reviewer_name');
    const reviewerOrg = cell(row, 'reviewer_org') || undefined;
    const country = cell(row, 'country') || undefined;
    const date = cell(row, 'date');
    const consent = cell(row, 'consent');
    const materialConnection = cell(row, 'material_connection');
    const note = cell(row, 'note') || '';

    const errors = [];

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      errors.push('rating must be an integer 1-5');
    }
    if (body.length < 20) {
      errors.push(`body too short (${body.length} chars, min 20)`);
    }
    if (!reviewerName) {
      errors.push('reviewer_name is required');
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('date must be YYYY-MM-DD');
    } else if (new Date(date) > new Date()) {
      errors.push('date cannot be in the future');
    }
    if (consent !== 'yes') {
      errors.push('consent must be "yes"');
    }
    if (!VALID_CONNECTIONS.includes(materialConnection)) {
      errors.push(`material_connection must be one of: ${VALID_CONNECTIONS.join(', ')}`);
    }

    rows.push({
      rowNum,
      handle,
      rating,
      title,
      body,
      reviewerName,
      reviewerOrg,
      country,
      date,
      consent,
      materialConnection,
      note,
      errors,
    });
  });

  // Validate product handles
  for (const row of rows) {
    const exists = await handleExists(row.handle);
    if (!exists) {
      row.errors.push(`product_handle "${row.handle}" not found in Storefront catalogue`);
    }
  }

  // Check for any errors
  const invalid = rows.filter((r) => r.errors.length > 0);
  if (invalid.length > 0) {
    console.error(`\nValidation errors — no reviews written:\n`);
    for (const r of invalid) {
      console.error(`  Row ${r.rowNum}: ${r.errors.join('; ')}`);
    }
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log('No data rows found.');
    process.exit(0);
  }

  // De-duplicate
  const existingKeys = await getExistingDedupKeys();
  const newRows = [];

  for (const row of rows) {
    const dk = dedupKey(row.handle, row.reviewerName, row.date, row.body);
    if (existingKeys.has(dk)) {
      console.log(`  Skipping duplicate: row ${row.rowNum} (${row.handle} / ${row.reviewerName} / ${row.date})`);
    } else {
      newRows.push(row);
      existingKeys.add(dk); // prevent intra-file dupes
    }
  }

  if (newRows.length === 0) {
    console.log('All rows already exist. Nothing to write.');
    process.exit(0);
  }

  // Dry-run output
  if (DRY_RUN) {
    console.log(`\n[dry-run] ${newRows.length} review(s) would be written (batch: ${BATCH}):\n`);
    for (const row of newRows) {
      const id = createHash('sha256').update(`${row.handle}:${row.reviewerName}:${row.date}:${row.body}`).digest('hex').slice(0, 12);
      console.log(`  review:imp-${id}  ${row.handle}  ${row.rating}\u2605  "${row.title}" by ${row.reviewerName}`);
    }
    process.exit(0);
  }

  // Write to KV
  let written = 0;
  for (const row of newRows) {
    const id = crypto.randomUUID();
    const review = {
      id,
      handle: row.handle,
      orderRefHash: '',
      stars: row.rating,
      title: row.title,
      body: row.body,
      tags: {},
      author: {
        initials: row.reviewerName,
        ...(row.reviewerOrg && { companyType: row.reviewerOrg }),
      },
      photos: [],
      created: new Date(row.date).toISOString(),
      status: 'published',
      source: 'imported',
      importBatch: BATCH,
      consent: true,
      materialConnection: row.materialConnection,
      ...(row.reviewerOrg && { reviewerOrg: row.reviewerOrg }),
      ...(row.country && { country: row.country }),
    };

    await fetch(`${KV_BASE}/values/${encodeURIComponent(`review:${id}`)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(review),
    });
    written++;
    console.log(`  Written: review:${id}  ${row.handle}  ${row.rating}\u2605  by ${row.reviewerName}`);
  }

  console.log(`\n${written} review(s) imported (batch: ${BATCH}).`);

  if (DEPLOY_HOOK) {
    await fetch(DEPLOY_HOOK, { method: 'POST' });
    console.log('Deploy triggered.');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
