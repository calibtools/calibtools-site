import { describe, it, expect } from 'vitest';
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
  function call(fields: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    const store = new Map<string, string>();
    const env = { QUOTES: { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => { store.set(k, v); } } };
    const request = new Request('https://calib.tools/api/quote', { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
    return { store, res: (onRequestPost as any)({ request, env }) as Promise<Response> };
  }

  it('stores the pattern link and source page with the request', async () => {
    const { store, res } = call({ name: 'A', company: 'B', email: 'a@b.co', product: 'ChArUco 7 × 10', message: '', pattern: '/tools/generator/?rows=7&cols=10', source_page: '/tools/generator/' });
    expect((await res).status).toBe(200);
    const saved = [...store.entries()].find(([k]) => k.startsWith('quote-'))!;
    const data = JSON.parse(saved[1]);
    expect(data.pattern).toBe('https://calib.tools/tools/generator/?rows=7&cols=10');
    expect(data.source_page).toBe('/tools/generator/');
  });

  it('drops a pattern link that is not a generator path', async () => {
    const { store, res } = call({ name: 'A', company: 'B', email: 'a@b.co', pattern: 'https://evil.example/' });
    await res;
    const data = JSON.parse([...store.entries()].find(([k]) => k.startsWith('quote-'))![1]);
    expect(data.pattern).toBe('');
  });
});
