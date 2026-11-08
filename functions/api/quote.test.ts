import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanPatternPath, onRequestPost } from './quote';

describe('cleanPatternPath', () => {
  it('accepts generator links with parameters', () => {
    const q = new URLSearchParams({ type: 'AprilGrid (Kalibr)', rows: '5', cols: '7', square: '30' }).toString();
    expect(cleanPatternPath(`/tools/generator/?${q}`)).toBe(`/tools/generator/?${q}`);
    expect(cleanPatternPath('/tools/generator/charuco/?rows=7&cols=10')).toBe('/tools/generator/charuco/?rows=7&cols=10');
  });
  it('rejects anything else', () => {
    for (const bad of ['https://evil.example/?a=1', '/quote/?x=1', '/tools/generator/?a=<script>', '//evil.example/tools/generator/?a=1', '']) {
      expect(cleanPatternPath(bad), bad).toBe('');
    }
  });
});

describe('POST /api/quote', () => {
  /** Fake network: DNS-over-HTTPS (MX) and Turnstile siteverify. */
  let mx = true, human = true;
  beforeEach(() => {
    mx = true; human = true;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('dns-query')) return new Response(JSON.stringify({ Status: 0, Answer: mx ? [{ type: 15 }] : [] }));
      if (String(url).includes('siteverify')) return new Response(JSON.stringify({ success: human }));
      throw new Error('unexpected fetch ' + url);
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  function call(fields: Record<string, string>, extraEnv: Record<string, string> = {}) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    const store = new Map<string, string>();
    const env = { ...extraEnv, QUOTES: { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => { store.set(k, v); } } };
    const request = new Request('https://calib.tools/api/quote', { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
    return { store, res: (onRequestPost as any)({ request, env }) as Promise<Response> };
  }

  it('stores the pattern link and source page with the request', async () => {
    const { store, res } = call({ name: 'A', company: 'B', email: 'eng@example-robotics.com', product: 'ChArUco 7 × 10', message: '', pattern: '/tools/generator/?rows=7&cols=10', source_page: '/tools/generator/' });
    expect((await res).status).toBe(200);
    const saved = [...store.entries()].find(([k]) => k.startsWith('quote-'))!;
    const data = JSON.parse(saved[1]);
    expect(data.pattern).toBe('https://calib.tools/tools/generator/?rows=7&cols=10');
    expect(data.source_page).toBe('/tools/generator/');
  });

  it('drops a pattern link that is not a generator path', async () => {
    const { store, res } = call({ name: 'A', company: 'B', email: 'eng@example-robotics.com', pattern: 'https://evil.example/' });
    await res;
    const data = JSON.parse([...store.entries()].find(([k]) => k.startsWith('quote-'))![1]);
    expect(data.pattern).toBe('');
  });

  const ok = { name: 'A', company: 'B', email: 'eng@example-robotics.com' };

  it('requires name, company and email', async () => {
    for (const missing of ['name', 'company', 'email']) {
      const { res } = call({ ...ok, [missing]: '' });
      const r = await res;
      expect(r.status, missing).toBe(400);
      expect((await r.json()).field).toBe(missing);
    }
  });

  it('refuses free and disposable mailboxes', async () => {
    for (const email of ['me@gmail.com', 'me@qq.com', 'x@mailinator.com']) {
      const r = await call({ ...ok, email }).res;
      expect(r.status, email).toBe(400);
      expect((await r.json()).field).toBe('email');
    }
  });

  it('refuses a domain without a mail server', async () => {
    mx = false;
    const r = await call(ok).res;
    expect(r.status).toBe(400);
  });

  it('enforces the human check once the Turnstile secret is set', async () => {
    const env = { TURNSTILE_SECRET_KEY: 'secret' };
    expect((await call(ok, env).res).status).toBe(403);
    human = false;
    expect((await call({ ...ok, 'cf-turnstile-response': 'tok' }, env).res).status).toBe(403);
    human = true;
    expect((await call({ ...ok, 'cf-turnstile-response': 'tok' }, env).res).status).toBe(200);
  });
});
