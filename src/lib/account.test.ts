import { describe, it, expect } from 'vitest';
import {
  AUTHORIZE_URL, SESSION_COOKIE, STATE_TTL_MS, MAX_PATTERNS,
  codeChallenge, randomToken, seal, open, safeReturnTo, authorizeUrl, logoutUrl,
  sessionCookie, clearSessionCookie, readCookie, needsRefresh, idTokenClaims,
  parseSavedPatterns, addPattern, removePattern, isGeneratorPath, newLoginState, checkLoginState,
  type Session,
} from './account';

const SECRET = 'x'.repeat(64);

describe('PKCE', () => {
  it('matches the RFC 7636 S256 example', async () => {
    expect(await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
  it('random tokens are url-safe and differ', () => {
    const a = randomToken(), b = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
});

describe('seal / open', () => {
  it('round-trips and is bound to secret and purpose', async () => {
    const t = await seal(SECRET, 'session', { a: 1, b: 'two' });
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await open(SECRET, 'session', t)).toEqual({ a: 1, b: 'two' });
    expect(await open(SECRET, 'state', t)).toBeNull();
    expect(await open('y'.repeat(64), 'session', t)).toBeNull();
  });
  it('rejects tampered or garbage input', async () => {
    const t = await seal(SECRET, 'session', { a: 1 });
    const flipped = t.slice(0, -2) + (t.at(-2) === 'A' ? 'B' : 'A') + t.at(-1);
    expect(await open(SECRET, 'session', flipped)).toBeNull();
    expect(await open(SECRET, 'session', '')).toBeNull();
    expect(await open(SECRET, 'session', '!!!')).toBeNull();
  });
});

describe('login state', () => {
  it('carries verifier, nonce and return path, and expires', async () => {
    const now = 1_800_000_000_000;
    const { state, verifier, nonce } = await newLoginState(SECRET, '/tools/generator/?rows=7', now);
    const ok = await checkLoginState(SECRET, state, now + 1000);
    expect(ok).toEqual({ v: verifier, n: nonce, r: '/tools/generator/?rows=7', t: now });
    expect(await checkLoginState(SECRET, state, now + STATE_TTL_MS + 1)).toBeNull();
  });
});

describe('safeReturnTo', () => {
  it('keeps same-site page paths', () => {
    expect(safeReturnTo('/tools/generator/?rows=7&cols=10')).toBe('/tools/generator/?rows=7&cols=10');
    expect(safeReturnTo('/account/')).toBe('/account/');
  });
  it('falls back to /account/ for anything else', () => {
    for (const bad of [null, '', 'https://evil.example/', '//evil.example/x', '/\\evil.example', '/api/account/logout', 'account', '/a\nb']) {
      expect(safeReturnTo(bad), String(bad)).toBe('/account/');
    }
  });
});

describe('authorize and logout URLs', () => {
  it('builds the authorization request', () => {
    const u = new URL(authorizeUrl({ clientId: 'cid', redirectUri: 'https://calib.tools/api/account/callback', state: 's', nonce: 'n', challenge: 'c' }));
    expect(`${u.origin}${u.pathname}`).toBe(AUTHORIZE_URL);
    expect(Object.fromEntries(u.searchParams)).toEqual({
      client_id: 'cid', response_type: 'code', redirect_uri: 'https://calib.tools/api/account/callback',
      scope: 'openid email customer-account-api:full', state: 's', nonce: 'n',
      code_challenge: 'c', code_challenge_method: 'S256',
    });
  });
  it('builds the logout request', () => {
    const u = new URL(logoutUrl('idt', 'https://calib.tools/'));
    expect(u.searchParams.get('id_token_hint')).toBe('idt');
    expect(u.searchParams.get('post_logout_redirect_uri')).toBe('https://calib.tools/');
  });
});

describe('cookies', () => {
  it('session cookie is HttpOnly, Secure, Lax, site-wide', () => {
    const c = sessionCookie('abc', 3600);
    expect(c).toBe(`${SESSION_COOKIE}=abc; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`);
    expect(clearSessionCookie()).toBe(`${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  });
  it('reads one cookie from a header', () => {
    expect(readCookie('a=1; ct_session=xyz; b=2', 'ct_session')).toBe('xyz');
    expect(readCookie(null, 'ct_session')).toBe('');
    expect(readCookie('xct_session=no', 'ct_session')).toBe('');
  });
  it('refreshes a minute before expiry', () => {
    const s: Session = { at: 'a', rt: 'r', exp: 100_000, id: 'i' };
    expect(needsRefresh(s, 30_000)).toBe(false);
    expect(needsRefresh(s, 50_000)).toBe(true);
  });
});

describe('idTokenClaims', () => {
  it('decodes the payload', () => {
    const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const jwt = `${b64({ alg: 'RS256' })}.${b64({ nonce: 'n1', email: 'a@b.example' })}.sig`;
    expect(idTokenClaims(jwt)).toEqual({ nonce: 'n1', email: 'a@b.example' });
    expect(idTokenClaims('nonsense')).toEqual({});
  });
});

describe('saved patterns', () => {
  const p1 = '/tools/generator/?type=ChArUco&rows=7&cols=10&square=30';
  const p2 = '/tools/generator/?type=Checkerboard&rows=6&cols=9&square=25';

  it('accepts generator links only', () => {
    expect(isGeneratorPath(p1)).toBe(true);
    expect(isGeneratorPath('/tools/generator/charuco/?rows=7')).toBe(true);
    expect(isGeneratorPath('https://evil.example/tools/generator/?a=1')).toBe(false);
    expect(isGeneratorPath('/tools/generator/?a=<b>')).toBe(false);
  });
  it('adds newest first, de-duplicates by link and caps the list', () => {
    let list = addPattern([], { name: 'A', path: p1 }, '2026-11-15T10:00:00Z');
    list = addPattern(list, { name: 'B', path: p2 }, '2026-11-15T11:00:00Z');
    list = addPattern(list, { name: 'A again', path: p1 }, '2026-11-15T12:00:00Z');
    expect(list.map((p) => p.name)).toEqual(['A again', 'B']);
    expect(list[0].id).toMatch(/^P-/);
    let many = list;
    for (let i = 0; i < MAX_PATTERNS + 5; i++) many = addPattern(many, { name: `n${i}`, path: `/tools/generator/?rows=${i + 3}&cols=9` }, '2026-11-15T13:00:00Z');
    expect(many).toHaveLength(MAX_PATTERNS);
  });
  it('trims names and rejects bad links', () => {
    expect(() => addPattern([], { name: 'x', path: '/quote/' }, '2026-11-15T10:00:00Z')).toThrow();
    const [p] = addPattern([], { name: '  ' + 'n'.repeat(200), path: p1 }, '2026-11-15T10:00:00Z');
    expect(p.name).toHaveLength(80);
    const [q] = addPattern([], { name: '   ', path: p1 }, '2026-11-15T10:00:00Z');
    expect(q.name).toBe(q.id);
  });
  it('removes by id', () => {
    const list = addPattern([], { name: 'A', path: p1 }, '2026-11-15T10:00:00Z');
    expect(removePattern(list, list[0].id)).toEqual([]);
  });
  it('parses stored JSON defensively', () => {
    expect(parseSavedPatterns(null)).toEqual([]);
    expect(parseSavedPatterns('not json')).toEqual([]);
    expect(parseSavedPatterns('{"a":1}')).toEqual([]);
    const good = addPattern([], { name: 'A', path: p1 }, '2026-11-15T10:00:00Z');
    expect(parseSavedPatterns(JSON.stringify([...good, { id: 'x', name: 'bad', path: '/evil' }]))).toEqual(good);
  });
});

describe('generator links from patternPath', () => {
  it('every generator link can be saved', async () => {
    const { GENERATOR_DEFAULT, patternPath } = await import('./patternLink');
    const path = patternPath({ ...GENERATOR_DEFAULT, type: 'AprilGrid (Kalibr)' as never });
    expect(isGeneratorPath(path)).toBe(true);
    expect(isGeneratorPath(patternPath(GENERATOR_DEFAULT))).toBe(true);
  });
});
