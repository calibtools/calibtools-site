/**
 * Review types, build-time fetch, and aggregation helpers.
 * KV namespace: REVIEWS (Cloudflare KV via REST API at build time).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewAuthor {
  initials: string;
  companyType?: string;
}

export interface ReviewReply {
  name: string;
  body: string;
  date: string;
}

export interface Review {
  id: string;
  handle: string;
  orderRefHash: string;
  stars: number;
  title: string;
  body: string;
  tags: {
    camera?: string;
    lensOrFov?: string;
    software?: string;
  };
  author: ReviewAuthor;
  photos: string[];
  created: string;
  status: 'published' | `removed:${string}`;
  reply?: ReviewReply;
}

export interface InviteToken {
  token: string;
  orderId: string;
  lineItemId: string;
  handle: string;
  email: string;
  customerName: string;
  created: string;
  expiresAt: string;
  sendAt: string;
  sent: boolean;
  used: boolean;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface ReviewSummary {
  average: number;
  count: number;
  distribution: number[];
}

export function summarize(reviews: Review[]): ReviewSummary {
  const published = reviews.filter((r) => r.status === 'published');
  if (published.length === 0) {
    return { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
  }
  const distribution = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const r of published) {
    distribution[r.stars - 1]++;
    sum += r.stars;
  }
  const average = Math.round((sum / published.length) * 10) / 10;
  return { average, count: published.length, distribution };
}

export function sortReviews(
  reviews: Review[],
  mode: 'relevant' | 'newest' | 'highest' | 'lowest',
): Review[] {
  const sorted = [...reviews];
  switch (mode) {
    case 'relevant':
      return sorted.sort((a, b) => {
        const aScore = (a.tags.camera || a.tags.lensOrFov || a.tags.software ? 1 : 0) + (a.photos.length > 0 ? 1 : 0);
        const bScore = (b.tags.camera || b.tags.lensOrFov || b.tags.software ? 1 : 0) + (b.photos.length > 0 ? 1 : 0);
        if (bScore !== aScore) return bScore - aScore;
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      });
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    case 'highest':
      return sorted.sort((a, b) => b.stars - a.stars || new Date(b.created).getTime() - new Date(a.created).getTime());
    case 'lowest':
      return sorted.sort((a, b) => a.stars - b.stars || new Date(b.created).getTime() - new Date(a.created).getTime());
  }
}

// ---------------------------------------------------------------------------
// HMAC token generation
// ---------------------------------------------------------------------------

export async function generateToken(
  secret: string,
  orderId: string,
  lineItemId: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const data = new TextEncoder().encode(`${orderId}:${lineItemId}`);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Build-time fetch (Cloudflare KV REST API)
// ---------------------------------------------------------------------------

const CF_ACCOUNT_ID = import.meta.env.CF_ACCOUNT_ID ?? '';
const CF_KV_NAMESPACE_ID = import.meta.env.CF_KV_REVIEWS_NAMESPACE_ID ?? '';
const CF_API_TOKEN = import.meta.env.CF_API_TOKEN ?? '';

export async function getReviewsForProduct(handle: string): Promise<Review[]> {
  const all = await getAllReviews();
  return all.filter((r) => r.handle === handle);
}

export async function getAllPublishedReviews(): Promise<Review[]> {
  const all = await getAllReviews();
  return all.filter((r) => r.status === 'published');
}

async function getAllReviews(): Promise<Review[]> {
  if (!CF_ACCOUNT_ID || !CF_KV_NAMESPACE_ID || !CF_API_TOKEN) return [];
  try {
    const listUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/keys?prefix=review:`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    });
    if (!listRes.ok) return [];
    const listData = await listRes.json() as { result: Array<{ name: string }> };
    const keys = listData.result.map((k) => k.name);
    const reviews: Review[] = [];
    for (const key of keys) {
      const valUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/values/${encodeURIComponent(key)}`;
      const valRes = await fetch(valUrl, {
        headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
      });
      if (valRes.ok) {
        reviews.push(await valRes.json() as Review);
      }
    }
    return reviews;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const HOW_REVIEWS_WORK = 'Only customers we e-mail after delivery can review. Each review is tied to an order number, and all reviews are published, including negative ones. We remove only spam or personal data, and say so where we do. We do not pay or discount for reviews.';

export const HOW_REVIEWS_WORK_SHORT = 'Reviews come only from customers we e-mail after delivery, are tied to an order, and are all published, negative ones included. No paid reviews.';
