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

import { adminFetch, AdminTokenError } from '../../src/lib/shopifyAdmin';
import { verifyTurnstile } from '../../src/lib/turnstile';
import { cleanTag, isNotifyOnly } from '../../src/lib/subscribeTags';

interface Env {
  SHOPIFY_CLIENT_ID?: string;
  SHOPIFY_CLIENT_SECRET?: string;
  SHOPIFY_STORE_DOMAIN?: string;
  QUOTES?: KVNamespace;
  WEBHOOKS?: KVNamespace;
  TURNSTILE_SECRET_KEY?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT = 10; // per hour per IP

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const json = (type: string, body: Record<string, any>, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  let body: { email?: string; honeypot?: string; tag?: string; turnstile?: string };
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

  // Human check (Cloudflare Turnstile)
  const human = await verifyTurnstile(String(body.turnstile ?? ''), ctx.env.TURNSTILE_SECRET_KEY, ip);
  if (!human.ok) return json('error', { ok: false, message: human.message }, 403);
  if (ctx.env.QUOTES) {
    const rateKey = `sub-rate-${ip}-${Math.floor(Date.now() / 3_600_000)}`;
    const count = Number(await ctx.env.QUOTES.get(rateKey) ?? '0');
    if (count >= RATE_LIMIT) {
      return json('error', { ok: false, message: 'Too many requests. Try again later.' }, 429);
    }
    await ctx.env.QUOTES.put(rateKey, String(count + 1), { expirationTtl: 3600 });
  }

  // Every failure has its own reference, shown in the message and written to the log with the reason
  // (never the email address), so one screenshot tells which step broke.
  //   S0 settings missing · S1 access token · S2 customer search · S3 customer create (request failed)
  //   S4 customer create (refused by Shopify) · S5 marketing consent · S6 tag
  const fail = (code: string, reason: unknown, status = 500) => {
    console.error(`[subscribe] ${code}: ${reason instanceof Error ? reason.message : String(reason)}`);
    const message = status === 503 ? `Sign-up is temporarily unavailable (${code}).` : `Something went wrong (${code}). Please try again.`;
    return json('error', { ok: false, code, message }, status);
  };
  /** Run one Shopify step; a failed token exchange is S1 whichever step asked for the token. */
  const step = async <T>(code: string, run: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; res: Response }> => {
    try {
      return { ok: true, value: await run() };
    } catch (err) {
      return { ok: false, res: fail(err instanceof AdminTokenError ? 'S1' : code, err) };
    }
  };

  if (!ctx.env.SHOPIFY_STORE_DOMAIN || !ctx.env.SHOPIFY_CLIENT_ID || !ctx.env.SHOPIFY_CLIENT_SECRET) {
    return fail('S0', 'Shopify settings missing', 503);
  }

  const FIND = `
    query FindCustomer($query: String!) {
      customers(first: 1, query: $query) { nodes { id } }
    }
  `;

  // Find existing customer
  const found = await step('S2', () => adminFetch(ctx.env, FIND, { query: `email:${email}` }));
  if (!found.ok) return found.res;

  let customerId: string | undefined = found.value.customers.nodes[0]?.id;

  if (!customerId) {
    const made = await step('S3', () => adminFetch(ctx.env, `
      mutation CustomerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer { id }
          userErrors { field message }
        }
      }
    `, { input: { email } }));
    if (!made.ok) return made.res;

    customerId = made.value.customerCreate.customer?.id;
    if (!customerId) {
      const ue = made.value.customerCreate.userErrors?.[0];
      if (ue?.message?.toLowerCase().includes('taken')) {
        // Race: the customer was created a moment ago, so look it up again.
        const again = await step('S2', () => adminFetch(ctx.env, FIND, { query: `email:${email}` }));
        if (!again.ok) return again.res;
        customerId = again.value.customers.nodes[0]?.id;
      }
      // Shopify's reason goes to the log, not to the visitor.
      if (!customerId) return fail('S4', ue?.message ?? 'customerCreate returned no customer');
    }
  }

  // A "notify:" tag is one release notification, not a newsletter signup: no marketing consent is set.
  const tag = cleanTag(body.tag);
  const notifyOnly = isNotifyOnly(tag);
  let state = 'NOTIFY';

  if (!notifyOnly) {
    const id = customerId;
    const consented = await step('S5', () => adminFetch(ctx.env, `
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
        customerId: id,
        emailMarketingConsent: {
          marketingState: 'SUBSCRIBED',
          marketingOptInLevel: 'SINGLE_OPT_IN',
          consentUpdatedAt: new Date().toISOString(),
        },
      },
    }));
    if (!consented.ok) return consented.res;
    const consent = consented.value.customerEmailMarketingConsentUpdate.customer?.emailMarketingConsent;
    state = consent?.marketingState ?? 'SUBSCRIBED';
  }

  // Apply optional tag (e.g. "revision:charuco-composite", "notify:plumbline")
  if (tag) {
    const id = customerId;
    const tagged = await step('S6', () => adminFetch(ctx.env, `
      mutation AddTag($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          userErrors { field message }
        }
      }
    `, { id, tags: [tag] }));
    // For a newsletter signup the tag is extra. For a notify request it is the whole point.
    if (!tagged.ok && notifyOnly) return tagged.res;
  }

  return json('ok', { ok: true, state });
};
