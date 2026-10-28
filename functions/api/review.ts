/**
 * Cloudflare Pages Function: /api/review
 *
 * GET  ?token=<token> — validate invite token, return product info
 * POST — submit review: validate token, validate fields, store, trigger deploy
 *
 * Required bindings:
 * - REVIEWS: KV namespace
 * - REVIEW_HMAC_SECRET: secret for token generation
 * - CF_DEPLOY_HOOK: deploy hook URL
 */

interface Env {
  REVIEWS?: KVNamespace;
  REVIEW_HMAC_SECRET?: string;
  CF_DEPLOY_HOOK?: string;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const token = url.searchParams.get('token');
  if (!token || !ctx.env.REVIEWS) {
    return Response.json({ ok: false, message: 'Invalid token' }, { status: 400 });
  }

  const invite = await ctx.env.REVIEWS.get(`invite:${token}`, 'json') as any;
  if (!invite) {
    return Response.json({ ok: false, message: 'Token not found or expired' }, { status: 404 });
  }
  if (invite.used) {
    return Response.json({ ok: false, message: 'This invitation has already been used' }, { status: 410 });
  }
  if (new Date(invite.expiresAt) < new Date()) {
    return Response.json({ ok: false, message: 'This invitation has expired' }, { status: 410 });
  }

  return Response.json({
    ok: true,
    handle: invite.handle,
    productTitle: invite.productTitle || invite.handle,
    customerName: invite.customerName,
  });
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!ctx.env.REVIEWS || !ctx.env.REVIEW_HMAC_SECRET) {
    return Response.json({ ok: false, message: 'Reviews not configured' }, { status: 503 });
  }

  const formData = await ctx.request.formData();
  const token = String(formData.get('token') ?? '');
  const stars = Number(formData.get('stars') ?? 0);
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const camera = String(formData.get('camera') ?? '').trim();
  const lensOrFov = String(formData.get('lensOrFov') ?? '').trim();
  const software = String(formData.get('software') ?? '').trim();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const companyType = String(formData.get('companyType') ?? '').trim();

  // Validate token
  const invite = await ctx.env.REVIEWS.get(`invite:${token}`, 'json') as any;
  if (!invite) {
    return Response.json({ ok: false, message: 'Token not found or expired' }, { status: 404 });
  }
  if (invite.used) {
    return Response.json({ ok: false, message: 'This invitation has already been used' }, { status: 410 });
  }
  if (new Date(invite.expiresAt) < new Date()) {
    return Response.json({ ok: false, message: 'This invitation has expired' }, { status: 410 });
  }

  // Validate fields
  if (stars < 1 || stars > 5) {
    return Response.json({ ok: false, message: 'Rating must be 1-5' }, { status: 400 });
  }
  if (body.length < 40) {
    return Response.json({ ok: false, message: 'Review body must be at least 40 characters' }, { status: 400 });
  }

  // Build author initials
  const initials = displayName
    || invite.customerName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3)
    || 'Anon';

  const id = crypto.randomUUID();
  const orderRefHash = invite.orderId.slice(-8);

  const review = {
    id,
    handle: invite.handle,
    orderRefHash,
    stars,
    title,
    body,
    tags: {
      ...(camera && { camera }),
      ...(lensOrFov && { lensOrFov }),
      ...(software && { software }),
    },
    author: {
      initials,
      ...(companyType && { companyType }),
    },
    photos: [],
    created: new Date().toISOString(),
    status: 'published',
    source: 'order' as const,
  };

  await ctx.env.REVIEWS.put(`review:${id}`, JSON.stringify(review));

  // Mark invite as used
  invite.used = true;
  await ctx.env.REVIEWS.put(`invite:${token}`, JSON.stringify(invite));

  // Trigger deploy
  if (ctx.env.CF_DEPLOY_HOOK) {
    fetch(ctx.env.CF_DEPLOY_HOOK, { method: 'POST' }).catch(() => {});
  }

  return Response.json({ ok: true, id });
};
