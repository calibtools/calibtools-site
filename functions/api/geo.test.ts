import { describe, it, expect } from 'vitest';
import { onRequestGet } from './geo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (cf?: object) => (onRequestGet as any)({ request: Object.assign(new Request('https://calib.tools/api/geo'), cf ? { cf } : {}) }) as Promise<Response>;

describe('GET /api/geo', () => {
  it('returns the country code only, never cached', async () => {
    const res = await call({ country: 'DE', city: 'Munich' });
    expect(await res.json()).toEqual({ country: 'DE' });
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it('returns an empty code when Cloudflare has none', async () => {
    expect(await (await call()).json()).toEqual({ country: '' });
    expect(await (await call({ country: 'T1x' })).json()).toEqual({ country: '' });
  });
});
