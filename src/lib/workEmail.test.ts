import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkWorkEmail, hasMailServer } from './workEmail';

describe('checkWorkEmail', () => {
  it('accepts company and university addresses', () => {
    for (const e of ['engineer@example-robotics.com', 'a.b@lirmm.fr', 'x@cs.stanford.edu', 'ops@sub.company.co.uk']) {
      expect(checkWorkEmail(e), e).toEqual({ ok: true });
    }
  });
  it('rejects free mailbox providers, including country variants and subdomains', () => {
    for (const e of ['me@gmail.com', 'me@GoogleMail.com', 'me@outlook.de', 'me@hotmail.co.uk', 'me@yahoo.co.jp', 'me@qq.com', 'me@163.com', 'me@web.de', 'me@gmx.net', 'me@icloud.com', 'me@proton.me']) {
      expect(checkWorkEmail(e).ok, e).toBe(false);
      expect((checkWorkEmail(e) as { reason?: string }).reason, e).toBe('free');
    }
  });
  it('rejects disposable addresses', () => {
    for (const e of ['x@mailinator.com', 'x@yopmail.com', 'x@guerrillamail.com']) expect((checkWorkEmail(e) as { reason?: string }).reason, e).toBe('disposable');
  });
  it('rejects malformed addresses', () => {
    for (const e of ['', 'no-at', 'a@b', 'a b@c.com', 'a@.com']) expect((checkWorkEmail(e) as { reason?: string }).reason, e).toBe('invalid');
  });
});

describe('hasMailServer', () => {
  afterEach(() => vi.unstubAllGlobals());
  const dns = (answer: unknown[] | undefined, status = 0) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ Status: status, Answer: answer }), { status: 200 })));

  it('is true when the domain has an MX record', async () => {
    dns([{ type: 15, data: '10 mx.example-robotics.com.' }]);
    expect(await hasMailServer('example-robotics.com')).toBe(true);
  });
  it('is false when the domain does not exist or has no MX', async () => {
    dns(undefined, 3);
    expect(await hasMailServer('no-such-company-xyz.com')).toBe(false);
    dns([]);
    expect(await hasMailServer('example.com')).toBe(false);
  });
  it('does not block when the DNS lookup itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    expect(await hasMailServer('example-robotics.com')).toBe(true);
  });
});
