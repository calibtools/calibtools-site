/**
 * Encryption for custom-offer documents.
 *
 * The data of a quotation is stored encrypted (AES-256-GCM) in a Shopify metaobject that the
 * Storefront API can read. The key is never stored: it is part of the link sent to the customer
 * (/q/<id>/<key>.pdf), so whoever lists the metaobjects sees ciphertext only.
 * Runs on Web Crypto, which Cloudflare Workers, browsers and Node 20+ all have.
 */

const b64url = (bytes: Uint8Array): string => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64url = (s: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/** Metaobject handle of an offer: lowercase letters and digits. */
export const isOfferId = (id: string): boolean => /^[a-z0-9]{16,40}$/.test(id);
/** 32 random bytes, base64url. */
export const isOfferKey = (key: string): boolean => /^[A-Za-z0-9_-]{43}$/.test(key);

export function newOfferId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

const importKey = (key: string, usage: KeyUsage) =>
  crypto.subtle.importKey('raw', fromB64url(key), 'AES-GCM', false, [usage]);

/** Encrypt the JSON text of an offer. Returns the stored payload and the key for the link. */
export async function encryptOffer(json: string): Promise<{ payload: string; key: string }> {
  const key = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(key, 'encrypt'), new TextEncoder().encode(json));
  return { payload: `v1.${b64url(iv)}.${b64url(new Uint8Array(ct))}`, key };
}

/** Decrypt a stored payload. Returns null when the key is wrong or the payload was altered. */
export async function decryptOffer(payload: string, key: string): Promise<string | null> {
  const parts = payload.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !isOfferKey(key)) return null;
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64url(parts[1]) }, await importKey(key, 'decrypt'), fromB64url(parts[2]));
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}
