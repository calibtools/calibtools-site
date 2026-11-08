import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyTurnstile } from './turnstile';

describe('verifyTurnstile', () => {
  afterEach(() => vi.unstubAllGlobals());
  const siteverify = (success: boolean) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success }), { status: 200 })));

  it('is skipped (allowed) until the secret is configured', async () => {
    expect(await verifyTurnstile('', undefined, '1.2.3.4')).toEqual({ ok: true, skipped: true });
  });
  it('fails without a token once the secret is configured', async () => {
    expect((await verifyTurnstile('', 'secret', '1.2.3.4')).ok).toBe(false);
  });
  it('passes or fails with Cloudflare siteverify', async () => {
    siteverify(true);
    expect(await verifyTurnstile('tok', 'secret', '1.2.3.4')).toEqual({ ok: true });
    siteverify(false);
    expect((await verifyTurnstile('tok', 'secret', '1.2.3.4')).ok).toBe(false);
  });
  it('fails closed when siteverify cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect((await verifyTurnstile('tok', 'secret', '1.2.3.4')).ok).toBe(false);
  });
});
