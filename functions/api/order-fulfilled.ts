/**
 * Cloudflare Pages Function: POST /api/order-fulfilled
 *
 * Shopify orders/fulfilled webhook. HMAC-verified.
 * For each line item, stores an invite token in KV REVIEWS
 * with a 14-day send delay and 30-day expiry.
 *
 * Required bindings:
 * - SHOPIFY_WEBHOOK_SECRET: Shopify webhook signing secret
 * - REVIEWS: KV namespace
 * - REVIEW_HMAC_SECRET: secret for generating invite tokens
 */

import { verifyShopifyHmac } from './rebuild';

interface Env {
  SHOPIFY_WEBHOOK_SECRET?: string;
  REVIEWS?: KVNamespace;
  REVIEW_HMAC_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const secret = ctx.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !ctx.env.REVIEWS || !ctx.env.REVIEW_HMAC_SECRET) {
    return new Response('Not configured', { status: 503 });
  }

  const body = await ctx.request.arrayBuffer();
  const hmacHeader = ctx.request.headers.get('X-Shopify-Hmac-Sha256') ?? '';
  if (!hmacHeader || !(await verifyShopifyHmac(body, secret, hmacHeader))) {
    return new Response('Invalid HMAC', { status: 401 });
  }

  const order = JSON.parse(new TextDecoder().decode(body));
  const orderId = String(order.id);
  const customerName = `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim();
  const email = order.customer?.email ?? '';

  if (!email) {
    return Response.json({ ok: true, action: 'skipped', reason: 'no email' });
  }

  const now = new Date();
  const sendAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const lineItems = order.line_items ?? [];
  let stored = 0;

  for (const item of lineItems) {
    const lineItemId = String(item.id);

    // Generate HMAC token
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ctx.env.REVIEW_HMAC_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const data = new TextEncoder().encode(`${orderId}:${lineItemId}`);
    const sig = await crypto.subtle.sign('HMAC', key, data);
    const token = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const invite = {
      token,
      orderId,
      lineItemId,
      handle: item.handle ?? String(item.product_id ?? ''),
      productTitle: item.title ?? '',
      email,
      customerName,
      created: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      sendAt: sendAt.toISOString(),
      sent: false,
      used: false,
    };

    await ctx.env.REVIEWS.put(`invite:${token}`, JSON.stringify(invite), {
      expirationTtl: 30 * 24 * 60 * 60,
    });
    stored++;
  }

  return Response.json({ ok: true, action: 'stored', invites: stored });
};
