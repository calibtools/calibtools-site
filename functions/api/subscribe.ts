/**
 * Cloudflare Pages Function: POST /api/subscribe
 *
 * Subscribes a customer to email marketing via the Shopify Admin API.
 * Uses customerEmailMarketingConsentUpdate for proper marketing consent.
 *
 * Setup required:
 * 1. Shopify custom app with scopes: read_customers, write_customers
 *    (Settings → Apps and sales channels → Develop apps → Create app →
 *    Configure Admin API scopes → Install app → copy Admin API access token)
 * 2. Cloudflare Pages encrypted secrets:
 *    - SHOPIFY_ADMIN_TOKEN: the Admin API access token (shpat_...)
 *    - SHOPIFY_STORE_DOMAIN: e.g. shop.calib.tools
 * 3. (Optional) KV namespace QUOTES bound for rate limiting
 */

interface Env {
  SHOPIFY_ADMIN_TOKEN?: string;
  SHOPIFY_STORE_DOMAIN?: string;
  QUOTES?: KVNamespace;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT = 10; // per hour per IP

async function adminQuery(domain: string, token: string, query: string, variables: Record<string, any> = {}) {
  const res = await fetch(`https://${domain}/admin/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Admin API ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const json = (type: string, body: Record<string, any>, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  let body: { email?: string; honeypot?: string; tag?: string };
  try {
    body = await ctx.request.json();
  } catch {
    return json('error', { ok: false, message: 'Invalid request.' }, 400);
  }

  // Honeypot
  if (body.honeypot) return json('ok', { ok: true, state: 'SUBSCRIBED' });

  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return json('error', { ok: false, message: 'Please enter a valid email address.' }, 400);
  }

  // Rate limit by IP
  const ip = ctx.request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (ctx.env.QUOTES) {
    const rateKey = `sub-rate-${ip}-${Math.floor(Date.now() / 3_600_000)}`;
    const count = Number(await ctx.env.QUOTES.get(rateKey) ?? '0');
    if (count >= RATE_LIMIT) {
      return json('error', { ok: false, message: 'Too many requests. Try again later.' }, 429);
    }
    await ctx.env.QUOTES.put(rateKey, String(count + 1), { expirationTtl: 3600 });
  }

  const domain = ctx.env.SHOPIFY_STORE_DOMAIN;
  const token = ctx.env.SHOPIFY_ADMIN_TOKEN;
  if (!domain || !token) {
    return json('error', { ok: false, message: 'Newsletter signup is temporarily unavailable.' }, 503);
  }

  try {
    // Find existing customer
    const searchData = await adminQuery(domain, token, `
      query FindCustomer($query: String!) {
        customers(first: 1, query: $query) { nodes { id } }
      }
    `, { query: `email:${email}` });

    let customerId: string;
    const existing = searchData.customers.nodes[0];

    if (existing) {
      customerId = existing.id;
    } else {
      // Create customer
      const createData = await adminQuery(domain, token, `
        mutation CustomerCreate($input: CustomerInput!) {
          customerCreate(input: $input) {
            customer { id }
            userErrors { field message }
          }
        }
      `, { input: { email } });

      const created = createData.customerCreate.customer;
      if (!created) {
        const ue = createData.customerCreate.userErrors?.[0];
        // Don't expose Shopify error details
        if (ue?.message?.toLowerCase().includes('taken')) {
          // Race condition — customer was just created, try search again
          const retry = await adminQuery(domain, token, `
            query FindCustomer($query: String!) {
              customers(first: 1, query: $query) { nodes { id } }
            }
          `, { query: `email:${email}` });
          customerId = retry.customers.nodes[0]?.id;
          if (!customerId) return json('error', { ok: false, message: 'Something went wrong. Please try again.' }, 500);
        } else {
          return json('error', { ok: false, message: 'Something went wrong. Please try again.' }, 500);
        }
      } else {
        customerId = created.id;
      }
    }

    // Update marketing consent
    const consentData = await adminQuery(domain, token, `
      mutation UpdateConsent($input: CustomerEmailMarketingConsentUpdateInput!) {
        customerEmailMarketingConsentUpdate(input: $input) {
          customer {
            id
            emailMarketingConsent { marketingState consentUpdatedAt }
          }
          userErrors { field message }
        }
      }
    `, {
      input: {
        customerId,
        emailMarketingConsent: {
          marketingState: 'SUBSCRIBED',
          marketingOptInLevel: 'SINGLE_OPT_IN',
          consentUpdatedAt: new Date().toISOString(),
        },
      },
    });

    const consent = consentData.customerEmailMarketingConsentUpdate.customer?.emailMarketingConsent;
    const state = consent?.marketingState ?? 'SUBSCRIBED';

    // Apply optional tag (e.g. "revision:charuco-composite")
    const tag = typeof body.tag === 'string' ? body.tag.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 64) : '';
    if (tag && customerId) {
      try {
        await adminQuery(domain, token, `
          mutation AddTag($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              userErrors { field message }
            }
          }
        `, { id: customerId, tags: [tag] });
      } catch {
        // Non-critical — subscription succeeded even if tagging fails
      }
    }

    return json('ok', { ok: true, state });
  } catch {
    return json('error', { ok: false, message: 'Something went wrong. Please try again.' }, 500);
  }
};
