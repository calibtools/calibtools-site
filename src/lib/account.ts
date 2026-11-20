/**
 * Customer accounts (sign-in through Shopify customer accounts).
 *
 * Pure helpers shared by the Pages Functions under functions/api/account/ and their tests:
 * OAuth 2.0 authorization code flow with PKCE (confidential client), the sealed session
 * cookie, and the saved-patterns list stored on the customer's Shopify record
 * (metafield calibtools.saved_patterns, JSON).
 *
 * Cookies (CLAUDE.md, /privacy/), both first-party and HttpOnly:
 *  - ct_login: set when sign-in starts, 10 minutes, path /api/account/. A random value that is
 *    also sealed into the OAuth `state`, so the callback only completes in the browser that
 *    started the sign-in (login CSRF). Cleared by the callback.
 *  - ct_session: set after a successful sign-in; holds the encrypted Shopify tokens.
 */
import { patternId, specFromLink } from './patternLink';

export const SHOP_ID = '106560684380';
const AUTH_BASE = `https://shopify.com/authentication/${SHOP_ID}`;
export const AUTHORIZE_URL = `${AUTH_BASE}/oauth/authorize`;
export const TOKEN_URL = `${AUTH_BASE}/oauth/token`;
export const LOGOUT_URL = `${AUTH_BASE}/logout`;
export const CUSTOMER_API_VERSION = '2026-10';
export const GRAPHQL_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/${CUSTOMER_API_VERSION}/graphql`;
export const SCOPE = 'openid email customer-account-api:full';

export const CALLBACK_PATH = '/api/account/callback';
export const ACCOUNT_PATH = '/account/';
export const SESSION_COOKIE = 'ct_session';
export const LOGIN_COOKIE = 'ct_login';
/** How long the browser keeps the session cookie; the refresh token keeps the session alive within it. */
export const SESSION_MAX_AGE_S = 14 * 24 * 3600;
export const STATE_TTL_MS = 10 * 60 * 1000;

export const PATTERNS_NAMESPACE = 'calibtools';
export const PATTERNS_KEY = 'saved_patterns';
export const MAX_PATTERNS = 50;
const MAX_NAME = 80;
const MAX_PATH = 600;

// ── encoding ────────────────────────────────────────────────────────────────

export function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function fromB64url(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad base64url');
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** 32 random bytes, base64url (43 characters): PKCE verifier, nonce. */
export function randomToken(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function codeChallenge(verifier: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

// ── sealed values (AES-GCM, key derived per purpose) ────────────────────────

async function keyFor(secret: string, purpose: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`calibtools-account:${purpose}:${secret}`));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function seal(secret: string, purpose: string, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(secret, purpose), new TextEncoder().encode(JSON.stringify(value))));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64url(out);
}

export async function open<T = unknown>(secret: string, purpose: string, token: string): Promise<T | null> {
  try {
    const bytes = fromB64url(token);
    if (bytes.length < 13) return null;
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await keyFor(secret, purpose), bytes.slice(12));
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    return null;
  }
}

// ── login state ─────────────────────────────────────────────────────────────

/** v: PKCE verifier, n: nonce, b: browser binding (also in the ct_login cookie), r: return path, t: issued (ms). */
export interface LoginState { v: string; n: string; b: string; r: string; t: number }

export async function newLoginState(secret: string, returnTo: string | null, now = Date.now()) {
  const verifier = randomToken();
  const nonce = randomToken();
  const binding = randomToken();
  const state = await seal(secret, 'state', { v: verifier, n: nonce, b: binding, r: safeReturnTo(returnTo), t: now } satisfies LoginState);
  return { state, verifier, nonce, binding };
}

/** The decrypted state if it is fresh and was started in this browser (binding equals the ct_login cookie). */
export async function checkLoginState(secret: string, state: string, binding: string, now = Date.now()): Promise<LoginState | null> {
  const s = await open<LoginState>(secret, 'state', state);
  if (!s || typeof s.v !== 'string' || typeof s.n !== 'string' || typeof s.b !== 'string' || typeof s.t !== 'number') return null;
  if (!binding || binding !== s.b) return null;
  if (now - s.t > STATE_TTL_MS || s.t > now + 60_000) return null;
  return { ...s, r: safeReturnTo(s.r) };
}

/** Where to land after sign-in: a page path on this site, never an API route or another host. */
export function safeReturnTo(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\') || v.startsWith('/api/')) return ACCOUNT_PATH;
  if (v.length > MAX_PATH || /[\s\\<>"]/.test(v)) return ACCOUNT_PATH;
  return v;
}

export function authorizeUrl(p: { clientId: string; redirectUri: string; state: string; nonce: string; challenge: string }): string {
  const u = new URL(AUTHORIZE_URL);
  u.search = new URLSearchParams({
    client_id: p.clientId,
    response_type: 'code',
    redirect_uri: p.redirectUri,
    scope: SCOPE,
    state: p.state,
    nonce: p.nonce,
    code_challenge: p.challenge,
    code_challenge_method: 'S256',
  }).toString();
  return u.toString();
}

export function logoutUrl(idToken: string, postLogoutRedirect: string): string {
  const u = new URL(LOGOUT_URL);
  u.search = new URLSearchParams({ id_token_hint: idToken, post_logout_redirect_uri: postLogoutRedirect }).toString();
  return u.toString();
}

/** Claims of an ID token received straight from the token endpoint over TLS (OIDC Core 3.1.3.7: signature check optional there). */
export function idTokenClaims(jwt: string): Record<string, unknown> {
  try {
    const part = jwt.split('.')[1];
    if (!part) return {};
    const v = JSON.parse(new TextDecoder().decode(fromB64url(part)));
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

// ── session ─────────────────────────────────────────────────────────────────

/** at: access token, rt: refresh token, exp: access-token expiry (ms), id: ID token (logout hint). */
export interface Session { at: string; rt: string; exp: number; id: string }

export interface TokenResponse { access_token: string; refresh_token?: string; id_token?: string; expires_in?: number }

export function sessionFromTokens(t: TokenResponse, previous?: Session, now = Date.now()): Session {
  return {
    at: t.access_token,
    rt: t.refresh_token ?? previous?.rt ?? '',
    exp: now + (t.expires_in ?? 3600) * 1000,
    id: t.id_token ?? previous?.id ?? '',
  };
}

export function needsRefresh(s: Session, now = Date.now()): boolean {
  return now > s.exp - 60_000;
}

const COOKIE_ATTRS = 'HttpOnly; Secure; SameSite=Lax';

export function sessionCookie(value: string, maxAge = SESSION_MAX_AGE_S): string {
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; ${COOKIE_ATTRS}`;
}

export const LOGIN_COOKIE_PATH = '/api/account/';

export function loginCookie(value: string): string {
  return `${LOGIN_COOKIE}=${value}; Path=${LOGIN_COOKIE_PATH}; Max-Age=${STATE_TTL_MS / 1000}; ${COOKIE_ATTRS}`;
}

export function clearLoginCookie(): string {
  return `${LOGIN_COOKIE}=; Path=${LOGIN_COOKIE_PATH}; Max-Age=0; ${COOKIE_ATTRS}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; ${COOKIE_ATTRS}`;
}

export function readCookie(header: string | null, name: string): string {
  if (!header) return '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

// ── saved patterns ──────────────────────────────────────────────────────────

export interface SavedPattern { id: string; name: string; path: string; savedAt: string }

export function isGeneratorPath(v: string): boolean {
  return v.length <= MAX_PATH
    && /^\/tools\/generator(\/[a-z-]+)?\/?\?[A-Za-z0-9_.~%=&+-]*$/.test(v)
    && specFromLink(v) !== null;
}

function validPattern(p: unknown): p is SavedPattern {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.name === 'string' && typeof o.path === 'string' && typeof o.savedAt === 'string'
    && isGeneratorPath(o.path) && o.name.length <= MAX_NAME;
}

export function parseSavedPatterns(value: string | null | undefined): SavedPattern[] {
  if (!value) return [];
  try {
    const v = JSON.parse(value);
    return Array.isArray(v) ? v.filter(validPattern).slice(0, MAX_PATTERNS) : [];
  } catch {
    return [];
  }
}

export function addPattern(list: SavedPattern[], p: { name: string; path: string }, savedAt = new Date().toISOString()): SavedPattern[] {
  const path = p.path.trim();
  const spec = isGeneratorPath(path) ? specFromLink(path) : null;
  if (!spec) throw new Error('not a generator link');
  const id = patternId(spec);
  const name = p.name.trim().slice(0, MAX_NAME) || id;
  return [{ id, name, path, savedAt }, ...list.filter((x) => x.path !== path)].slice(0, MAX_PATTERNS);
}

export function removePattern(list: SavedPattern[], id: string): SavedPattern[] {
  return list.filter((x) => x.id !== id);
}

/** A customer's own name for a saved pattern. An empty name leaves the entry as it is. */
export function renamePattern(list: SavedPattern[], id: string, name: string): SavedPattern[] {
  const clean = name.trim().slice(0, MAX_NAME);
  return clean ? list.map((x) => (x.id === id ? { ...x, name: clean } : x)) : list;
}

// ── quotation documents (written by Calib.Tools in the admin, read-only for the customer) ──

export const OFFERS_KEY = 'offers';
const OFFER_PDF_RE = /^https:\/\/calib\.tools\/q\/[a-z0-9]{8,64}\/[A-Za-z0-9_-]{16,128}\.pdf$/;

export interface OfferDoc {
  /** Quotation PDF on calib.tools/q/…, or ''. */
  pdf: string;
  /** Generator path that reopens the pattern, or ''. */
  pattern: string;
  /** Pattern ID computed from the path, or ''. */
  patternId: string;
  /** Quotation number as printed on the PDF, or ''. */
  no: string;
}

/**
 * Customer metafield calibtools.offers: [{ draft: "#D4", no: "Q-…", pdf, pattern }]. Returns the documents by
 * draft-order name. Anything that is not a calib.tools quotation link or a generator path is dropped.
 */
export function parseOffers(value: string | null | undefined): Map<string, OfferDoc> {
  const out = new Map<string, OfferDoc>();
  if (!value) return out;
  let list: unknown;
  try { list = JSON.parse(value); } catch { return out; }
  if (!Array.isArray(list)) return out;
  for (const e of list.slice(0, 100)) {
    if (!e || typeof e !== 'object') continue;
    const { draft, pdf, pattern, no } = e as Record<string, unknown>;
    if (typeof draft !== 'string' || !/^#D\d{1,9}$/.test(draft)) continue;
    const pdfOk = typeof pdf === 'string' && OFFER_PDF_RE.test(pdf) ? pdf : '';
    const path = typeof pattern === 'string' && isGeneratorPath(pattern.trim()) ? pattern.trim() : '';
    const spec = path ? specFromLink(path) : null;
    const quoteNo = typeof no === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(no) ? no : '';
    if (!pdfOk && !spec && !quoteNo) continue;
    out.set(draft, { pdf: pdfOk, pattern: spec ? path : '', patternId: spec ? patternId(spec) : '', no: quoteNo });
  }
  return out;
}
