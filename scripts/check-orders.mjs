/**
 * Manual-run script: list recent orders with line-item properties
 * (start_id, id_range) via Shopify Admin API.
 *
 * Usage:
 *   node scripts/check-orders.mjs [--count 10]
 *
 * Requires environment variables (or .env):
 *   SHOPIFY_STORE_DOMAIN  — e.g. shop.calib.tools
 *   SHOPIFY_CLIENT_ID     — OAuth client ID
 *   SHOPIFY_CLIENT_SECRET — OAuth client secret
 *
 * Packing slip configuration:
 *   Shopify shows line-item properties on packing slips automatically if
 *   the property name does NOT start with underscore (_). Our properties
 *   "start_id" and "id_range" will appear by default.
 *
 *   To customise the packing slip template:
 *   Settings → Shipping and delivery → Packing slips → Edit template
 *
 *   The Liquid template accesses properties via:
 *     {% for property in line_item.properties %}
 *       {{ property.first }}: {{ property.last }}
 *     {% endfor %}
 *
 *   Properties starting with _ (e.g. _internal_note) are hidden from
 *   customers on the order status page and packing slips.
 */

import { readFileSync } from 'node:fs';

// --- Load .env ---
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

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const clientId = process.env.SHOPIFY_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

if (!domain || !clientId || !clientSecret) {
  console.error('Missing SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, or SHOPIFY_CLIENT_SECRET');
  process.exit(1);
}

// --- Mint token via client-credentials grant ---
const tokenRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }),
});
if (!tokenRes.ok) {
  console.error(`Token exchange failed: ${tokenRes.status} ${tokenRes.statusText}`);
  process.exit(1);
}
const { access_token: token } = await tokenRes.json();

const countArg = process.argv.includes('--count')
  ? Number(process.argv[process.argv.indexOf('--count') + 1])
  : 10;

const count = Number.isFinite(countArg) && countArg > 0 ? Math.min(countArg, 50) : 10;

// --- Admin API query ---

const query = `{
  orders(first: ${count}, reverse: true) {
    nodes {
      id name createdAt
      lineItems(first: 50) {
        nodes {
          title sku quantity
          customAttributes { key value }
        }
      }
    }
  }
}`;

const res = await fetch(`https://${domain}/admin/api/2025-07/graphql.json`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': token,
  },
  body: JSON.stringify({ query }),
});

if (!res.ok) {
  console.error(`Admin API ${res.status}: ${res.statusText}`);
  process.exit(1);
}

const json = await res.json();
if (json.errors?.length) {
  console.error(`Admin API error: ${json.errors[0].message}`);
  process.exit(1);
}

const orders = json.data.orders.nodes;

if (orders.length === 0) {
  console.log('[check-orders] No orders found.');
  process.exit(0);
}

// --- Output ---

console.log(`\n[check-orders] Last ${orders.length} orders:\n`);

for (const order of orders) {
  const date = new Date(order.createdAt).toISOString().slice(0, 10);
  console.log(`  ${order.name}  (${date})`);

  for (const item of order.lineItems.nodes) {
    const props = (item.customAttributes ?? [])
      .filter((a) => a.key === 'start_id' || a.key === 'id_range')
      .map((a) => `${a.key}=${a.value}`)
      .join(', ');

    const skuStr = item.sku ? ` [${item.sku}]` : '';
    const propsStr = props ? ` → ${props}` : '';
    console.log(`    ${item.quantity}× ${item.title}${skuStr}${propsStr}`);
  }
  console.log('');
}

const withProps = orders.filter((o) =>
  o.lineItems.nodes.some((li) =>
    (li.customAttributes ?? []).some((a) => a.key === 'start_id' || a.key === 'id_range'),
  ),
);

console.log(`[check-orders] ${withProps.length}/${orders.length} orders have start_id or id_range properties.`);
console.log('\nPacking slip: properties appear automatically unless prefixed with _.');
console.log('Customise at: Settings → Shipping and delivery → Packing slips → Edit template.\n');
