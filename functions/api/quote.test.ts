import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanPatternPath, onRequestPost } from './quote';
import { onRequestGet as confirmGet } from './quote-confirm';
import { confirmToken, isQuoteId } from '../../src/lib/quote';
import { GENERATOR_DEFAULT, patternPath, patternId } from '../../src/lib/patternLink';

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
  let mx = true, human = true, resendOk = true;
  let sent: { to: string[]; subject: string; text: string; reply_to: string }[] = [];
  beforeEach(() => {
    mx = true; human = true; resendOk = true; sent = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('dns-query')) return new Response(JSON.stringify({ Status: 0, Answer: mx ? [{ type: 15 }] : [] }));
      if (String(url).includes('siteverify')) return new Response(JSON.stringify({ success: human }));
      if (String(url).includes('api.resend.com')) {
        sent.push(JSON.parse(String(init?.body)));
        return new Response('{}', { status: resendOk ? 200 : 500 });
      }
      throw new Error('unexpected fetch ' + url);
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  const full = { material: 'ceramic', quantity: '5', country: 'FR' };
  function call(input: Record<string, string>, extraEnv: Record<string, string> = {}, store = new Map<string, string>()) {
    const fields = { ...full, ...input };
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    const env = { ...extraEnv, QUOTES: { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => { store.set(k, v); } } };
    const request = new Request('https://calib.tools/api/quote', { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
    return { store, res: (onRequestPost as any)({ request, env }) as Promise<Response> };
  }

  it('stores the pattern link and source page with the request', async () => {
    const { store, res } = call({ name: 'A', company: 'B', email: 'eng@example-robotics.com', product: 'ChArUco 7 × 10', message: '', pattern: '/tools/generator/?rows=7&cols=10', source_page: '/tools/generator/' });
    expect((await res).status).toBe(200);
    const saved = [...store.entries()].find(([k]) => k.startsWith('quote:'))!;
    const data = JSON.parse(saved[1]);
    expect(data.pattern).toBe('https://calib.tools/tools/generator/?rows=7&cols=10');
    expect(data.source_page).toBe('/tools/generator/');
  });

  it('drops a pattern link that is not a generator path', async () => {
    const { store, res } = call({ name: 'A', company: 'B', email: 'eng@example-robotics.com', pattern: 'https://evil.example/' });
    await res;
    const data = JSON.parse([...store.entries()].find(([k]) => k.startsWith('quote:'))![1]);
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

  it('requires material, quantity and delivery country', async () => {
    for (const [field, bad] of [['material', ''], ['material', 'wood'], ['quantity', '0'], ['quantity', 'ten'], ['country', ''], ['country', 'XX']]) {
      const r = await call({ ...ok, [field]: bad }).res;
      expect(r.status, `${field}=${bad}`).toBe(400);
      expect((await r.json()).field).toBe(field);
    }
  });

  it('returns a reference number and stores the structured record under it', async () => {
    const { store, res } = call({ ...ok, product: 'ChArUco 22 × 32, 12 / 8.4 mm', boards: '2', message: 'Flash photography' });
    const data = await (await res).json();
    expect(data.ok).toBe(true);
    expect(isQuoteId(data.id)).toBe(true);
    const rec = JSON.parse(store.get(`quote:${data.id}`)!);
    expect(rec).toMatchObject({ id: data.id, material: 'ceramic', quantity: 5, boards: 2, country: 'FR', emailVerified: false });
  });

  it('emails hello@ with the reference number in the subject and confirms to the customer', async () => {
    const r = await call({ ...ok, product: 'ChArUco 9 × 12, 30 mm' }, { RESEND_API_KEY: 'k', QUOTE_HMAC_SECRET: 's' }).res;
    const { id, customerEmailSent } = await r.json();
    expect(customerEmailSent).toBe(true);
    const internal = sent.find((m) => m.to[0] === 'hello@calib.tools')!;
    expect(internal.subject).toBe(`${id} · ChArUco 9 × 12, 30 mm · ceramic · ×5`);
    expect(internal.reply_to).toBe('eng@example-robotics.com');
    const customer = sent.find((m) => m.to[0] === 'eng@example-robotics.com')!;
    expect(customer.subject).toContain(id);
    expect(customer.reply_to).toBe('hello@calib.tools');
    expect(customer.text).toContain(`/api/quote-confirm?q=${id}&t=${await confirmToken('s', id)}`);
  });

  it('computes the pattern ID on the server from the pattern link and puts it in the record, the reply and both emails', async () => {
    const spec = { ...GENERATOR_DEFAULT, rows: 9, cols: 12, square: 30, marker: 22 };
    const { store, res } = call({ ...ok, product: 'ChArUco 9 × 12, 30 mm', pattern: patternPath(spec), patternId: 'P-222222' }, { RESEND_API_KEY: 'k', QUOTE_HMAC_SECRET: 's' });
    const data = await (await res).json();
    expect(data.patternId).toBe(patternId(spec)); // not the value the browser claimed
    expect(JSON.parse(store.get(`quote:${data.id}`)!).patternId).toBe(patternId(spec));
    for (const m of sent) expect(m.text).toContain(`Pattern ID: ${patternId(spec)}`);
  });

  it('has no pattern ID when the request carries no pattern', async () => {
    const { store, res } = call({ ...ok, product: 'Custom glass target' }, { RESEND_API_KEY: 'k', QUOTE_HMAC_SECRET: 's' });
    const data = await (await res).json();
    expect(data.patternId).toBe('');
    expect(JSON.parse(store.get(`quote:${data.id}`)!).patternId).toBe('');
    for (const m of sent) expect(m.text).not.toContain('Pattern ID');
  });

  it('keeps the request when email fails (KV first)', async () => {
    resendOk = false;
    const { store, res } = call(ok, { RESEND_API_KEY: 'k' });
    const data = await (await res).json();
    expect(data.ok).toBe(true);
    expect(data.customerEmailSent).toBe(false);
    expect(store.has(`quote:${data.id}`)).toBe(true);
  });

  it('confirm link marks the email verified once; a wrong token does not', async () => {
    const store = new Map<string, string>();
    const env = { RESEND_API_KEY: 'k', QUOTE_HMAC_SECRET: 's' };
    const { id } = await (await call(ok, env, store).res).json();
    const kv = { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => { store.set(k, v); } };
    const go = (t: string) => (confirmGet as any)({ request: new Request(`https://calib.tools/api/quote-confirm?q=${id}&t=${t}`), env: { ...env, QUOTES: kv } }) as Promise<Response>;

    const bad = await go('0'.repeat(32));
    expect(bad.headers.get('Location')).toContain('status=invalid');
    expect(JSON.parse(store.get(`quote:${id}`)!).emailVerified).toBe(false);

    sent = [];
    const good = await go(await confirmToken('s', id));
    expect(good.headers.get('Location')).toBe(`https://calib.tools/quote/confirmed/?status=ok&q=${id}`);
    expect(JSON.parse(store.get(`quote:${id}`)!).emailVerified).toBe(true);
    expect(sent.map((m) => m.subject)).toEqual([`${id} · email confirmed`]);

    sent = [];
    await go(await confirmToken('s', id));
    expect(sent).toEqual([]);
  });
});
