/**
 * Cloudflare Pages Function: POST /api/subscribe
 *
 * Subscribes a customer to email marketing via the Shopify Admin API.
 * Uses customerEmailMarketingConsentUpdate for proper marketing consent.
 *
 * Setup required:
 * 1. Shopify custom app with scopes: read_customers, write_customers
 * 2. Cloudflare Pages encrypted secrets:
 *    - SHOPIFY_CLIENT_ID: OAuth client ID
 *    - SHOPIFY_CLIENT_SECRET: OAuth client secret
 *    - SHOPIFY_STORE_DOMAIN: e.g. shop.calib.tools
 * 3. (Optional) KV namespace QUOTES bound for rate limiting / token caching
 */

import { adminFetch } from '../../src/lib/shopifyAdmin';

interface Env {
  SHOPIFY_CLIENT_ID?: string;
  SHOPIFY_CLIENT_SECRET?: string;
  SHOPIFY_STORE_DOMAIN?: string;
  QUOTES?: KVNamespace;
  WEBHOOKS?: KVNamespace;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT = 10; // per hour per IP

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

  if (!ctx.env.SHOPIFY_STORE_DOMAIN || !ctx.env.SHOPIFY_CLIENT_ID || !ctx.env.SHOPIFY_CLIENT_SECRET) {
    return json('error', { ok: false, message: 'Newsletter signup is temporarily unavailable.' }, 503);
  }

  try {
    // Find existing customer
    const searchData = await adminFetch(ctx.env, `
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
      const createData = await adminFetch(ctx.env, `
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
          const retry = await adminFetch(ctx.env, `
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
    const consentData = await adminFetch(ctx.env, `
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
        await adminFetch(ctx.env, `
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
