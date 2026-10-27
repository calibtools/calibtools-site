import { describe, it, expect } from 'vitest';

/**
 * Unit-test the www→apex redirect logic extracted from functions/_middleware.ts.
 * We re-implement the core logic here because Cloudflare's PagesFunction type
 * isn't available in the vitest environment.
 */
function handleRequest(requestUrl: string): { status: number; location?: string } | 'next' {
  const url = new URL(requestUrl);
  if (url.hostname.startsWith('www.')) {
    url.hostname = url.hostname.replace(/^www\./, '');
    return { status: 301, location: url.toString() };
  }
  return 'next';
}

describe('www → apex redirect', () => {
  it('redirects www.calib.tools to calib.tools with 301', () => {
    const result = handleRequest('https://www.calib.tools/targets/charuco-composite/?size=300');
    expect(result).not.toBe('next');
    if (result === 'next') throw new Error('unreachable');
    expect(result.status).toBe(301);
    expect(result.location).toBe('https://calib.tools/targets/charuco-composite/?size=300');
  });

  it('passes through requests on the apex domain', () => {
    const result = handleRequest('https://calib.tools/tools/generator/');
    expect(result).toBe('next');
  });

  it('preserves path and query on redirect', () => {
    const result = handleRequest('https://www.calib.tools/guides/multi-board-marker-ids/?foo=bar#section');
    expect(result).not.toBe('next');
    if (result === 'next') throw new Error('unreachable');
    expect(result.status).toBe(301);
    expect(result.location).toBe('https://calib.tools/guides/multi-board-marker-ids/?foo=bar#section');
  });
});
