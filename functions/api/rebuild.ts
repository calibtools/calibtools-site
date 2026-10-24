/**
 * Cloudflare Pages Function: POST /api/rebuild
 *
 * Accepts a Shopify webhook POST, verifies X-Shopify-Hmac-Sha256,
 * and triggers a Cloudflare Pages deploy hook to rebuild the site.
 *
 * Debounces via KV: ignores duplicate triggers within 60 s so rapid
 * product edits don't cause a flood of deploys.
 *
 * Setup required:
 *
 * 1. Cloudflare Pages environment variables (encrypted secrets):
 *    - SHOPIFY_WEBHOOK_SECRET: the signing secret from Shopify webhook settings
 *    - CF_DEPLOY_HOOK: the Cloudflare Pages deploy hook URL
 *      (Pages project → Settings → Builds & deployments → Deploy hooks → Add)
 *
 * 2. (Optional) KV namespace bound as WEBHOOKS for debounce.
 *    Without KV, every valid webhook triggers a deploy immediately.
 *
 * 3. Shopify webhook configuration:
 *    Settings → Notifications → Webhooks → Create webhook
 *    Events: Product creation, Product update, Product deletion, Collection update
 *    URL: https://calib.tools/api/rebuild
 *    Format: JSON
 *    API version: 2025-07
 */

interface Env {
  SHOPIFY_WEBHOOK_SECRET?: string;
  CF_DEPLOY_HOOK?: string;
  WEBHOOKS?: KVNamespace;
}

const DEBOUNCE_SECONDS = 60;

/**
 * Verify Shopify webhook HMAC-SHA256 signature.
 * Returns true if the signature matches the request body.
 */
export async function verifyShopifyHmac(
  body: ArrayBuffer,
  secret: string,
  headerHmac: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, body);
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  // Constant-time comparison (best effort in JS)
  if (computed.length !== headerHmac.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ headerHmac.charCodeAt(i);
  }
  return mismatch === 0;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const secret = ctx.env.SHOPIFY_WEBHOOK_SECRET;
  const deployHook = ctx.env.CF_DEPLOY_HOOK;

  if (!secret || !deployHook) {
    return new Response('Webhook not configured', { status: 503 });
  }

  // Read body as ArrayBuffer for HMAC verification
  const body = await ctx.request.arrayBuffer();
  const hmacHeader = ctx.request.headers.get('X-Shopify-Hmac-Sha256') ?? '';

  if (!hmacHeader) {
    return new Response('Missing HMAC header', { status: 401 });
  }

  const valid = await verifyShopifyHmac(body, secret, hmacHeader);
  if (!valid) {
    return new Response('Invalid HMAC signature', { status: 401 });
  }

  // Debounce via KV (if bound)
  if (ctx.env.WEBHOOKS) {
    const debounceKey = 'rebuild-debounce';
    const lastTrigger = await ctx.env.WEBHOOKS.get(debounceKey);
    if (lastTrigger) {
      const elapsed = Date.now() - Number(lastTrigger);
      if (elapsed < DEBOUNCE_SECONDS * 1000) {
        return new Response(
          JSON.stringify({ ok: true, action: 'debounced', seconds_remaining: Math.ceil((DEBOUNCE_SECONDS * 1000 - elapsed) / 1000) }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }
    await ctx.env.WEBHOOKS.put(debounceKey, String(Date.now()), {
      expirationTtl: DEBOUNCE_SECONDS,
    });
  }

  // Trigger Cloudflare Pages deploy
  const res = await fetch(deployHook, { method: 'POST' });

  if (!res.ok) {
    return new Response(
      JSON.stringify({ ok: false, message: `Deploy hook returned ${res.status}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, action: 'deployed' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
