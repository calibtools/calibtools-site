/**
 * Tags sent with POST /api/subscribe.
 * A tag that starts with "notify:" asks for one notification about one thing (a release).
 * It is stored on the customer in Shopify, and the person is NOT subscribed to marketing email.
 * Any other tag (or none) is a newsletter signup with marketing consent.
 */
export const NOTIFY_PREFIX = 'notify:';

/** Keep letters, digits, colon, underscore and hyphen; at most 64 characters. */
export function cleanTag(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 64) : '';
}

export function isNotifyOnly(tag: string): boolean {
  return tag.startsWith(NOTIFY_PREFIX) && tag.length > NOTIFY_PREFIX.length;
}
