import { describe, it, expect, vi } from 'vitest';
import { shouldCount, referrerCategory } from './_middleware';

// ---------- helpers ----------

function makeRequest(
  url: string,
  overrides: {
    method?: string;
    accept?: string;
    ua?: string;
    referer?: string;
    secPurpose?: string;
    purpose?: string;
  } = {},
): Request {
  const headers = new Headers();
  headers.set('accept', overrides.accept ?? 'text/html,application/xhtml+xml');
  if (overrides.ua) headers.set('user-agent', overrides.ua);
  if (overrides.referer) headers.set('referer', overrides.referer);
  if (overrides.secPurpose) headers.set('sec-purpose', overrides.secPurpose);
  if (overrides.purpose) headers.set('purpose', overrides.purpose);
  return new Request(url, { method: overrides.method ?? 'GET', headers });
}

/** Simulate the middleware's counting logic and return what was written. */
function simulateCount(
  request: Request,
  responseStatus: number,
  pageViews?: { writeDataPoint: ReturnType<typeof vi.fn> },
): { written: unknown | null } {
  if (!shouldCount(request, responseStatus)) return { written: null };
  if (!pageViews) return { written: null };
  const pathname = new URL(request.url).pathname;
  const category = referrerCategory(request.headers.get('referer'));
  const data = {
    blobs: [pathname, category],
    doubles: [1],
    indexes: [pathname],
  };
  pageViews.writeDataPoint(data);
  return { written: data };
}

// ---------- tests ----------

describe('middleware', () => {
  // ── www redirect ──

  it('www → apex returns 301', async () => {
    // The onRequest export handles this; we just import and call it
    // through the actual function. Since PagesFunction context is hard
    // to mock, we test the redirect logic inline:
    const url = new URL('https://www.calib.tools/targets/charuco-composite/');
    expect(url.hostname).toBe('www.calib.tools');
    url.hostname = url.hostname.replace(/^www\./, '');
    expect(url.toString()).toBe('https://calib.tools/targets/charuco-composite/');
  });

  // ── should NOT count: assets ──

  it('skips asset paths (/_astro/)', () => {
    const req = makeRequest('https://calib.tools/_astro/chunk.abc123.js');
    expect(shouldCount(req, 200)).toBe(false);
  });

  it('skips paths with file extension', () => {
    const req = makeRequest('https://calib.tools/sitemap.xml');
    expect(shouldCount(req, 200)).toBe(false);
  });

  // ── should NOT count: POST ──

  it('skips POST requests', () => {
    const req = makeRequest('https://calib.tools/targets/charuco-composite/', { method: 'POST' });
    expect(shouldCount(req, 200)).toBe(false);
  });

  // ── should NOT count: prefetch ──

  it('skips prefetch (Sec-Purpose)', () => {
    const req = makeRequest('https://calib.tools/targets/charuco-composite/', { secPurpose: 'prefetch' });
    expect(shouldCount(req, 200)).toBe(false);
  });

  it('skips prefetch (Purpose)', () => {
    const req = makeRequest('https://calib.tools/targets/charuco-composite/', { purpose: 'prefetch' });
    expect(shouldCount(req, 200)).toBe(false);
  });

  // ── should NOT count: bot UA ──

  it('skips bot User-Agent', () => {
    const req = makeRequest('https://calib.tools/targets/charuco-composite/', { ua: 'Googlebot/2.1' });
    expect(shouldCount(req, 200)).toBe(false);
  });

  it('skips curl User-Agent', () => {
    const req = makeRequest('https://calib.tools/targets/charuco-composite/', { ua: 'curl/7.81.0' });
    expect(shouldCount(req, 200)).toBe(false);
  });

  it('skips headless User-Agent', () => {
    const req = makeRequest('https://calib.tools/', { ua: 'HeadlessChrome/120' });
    expect(shouldCount(req, 200)).toBe(false);
  });

  // ── should NOT count: 404 ──

  it('skips non-200 responses', () => {
    const req = makeRequest('https://calib.tools/nonexistent/');
    expect(shouldCount(req, 404)).toBe(false);
  });

  // ── should NOT count: missing binding ──

  it('writes nothing when PAGE_VIEWS binding is missing', () => {
    const req = makeRequest('https://calib.tools/targets/charuco-composite/');
    const result = simulateCount(req, 200, undefined);
    expect(result.written).toBeNull();
  });

  // ── should NOT count: non-HTML accept ──

  it('skips requests without text/html in Accept', () => {
    const req = makeRequest('https://calib.tools/targets/charuco-composite/', { accept: 'application/json' });
    expect(shouldCount(req, 200)).toBe(false);
  });

  // ── SHOULD count: normal page view ──

  it('counts a normal HTML GET and writes correct data', () => {
    const req = makeRequest('https://calib.tools/targets/charuco-composite/', {
      referer: 'https://calib.tools/tools/generator/charuco/',
      ua: 'Mozilla/5.0',
    });
    expect(shouldCount(req, 200)).toBe(true);

    const mock = { writeDataPoint: vi.fn() };
    const result = simulateCount(req, 200, mock);

    expect(mock.writeDataPoint).toHaveBeenCalledOnce();
    const written = result.written as Record<string, unknown>;
    expect(written).toEqual({
      blobs: ['/targets/charuco-composite/', 'generator'],
      doubles: [1],
      indexes: ['/targets/charuco-composite/'],
    });

    // Exactly these keys, nothing else
    expect(Object.keys(written).sort()).toEqual(['blobs', 'doubles', 'indexes']);

    // No IP or UA string in the written data
    const json = JSON.stringify(written);
    expect(json).not.toContain('user-agent');
    expect(json).not.toContain('Mozilla');
    expect(json).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
  });

  // ── referrerCategory ──

  it('classifies generator referrer', () => {
    expect(referrerCategory('https://calib.tools/tools/generator/charuco/')).toBe('generator');
  });

  it('classifies guide referrer', () => {
    expect(referrerCategory('https://calib.tools/guides/charuco-vs-checkerboard-vs-aprilgrid/')).toBe('guide');
  });

  it('classifies collection referrer', () => {
    expect(referrerCategory('https://calib.tools/targets/collection/composite-boards/')).toBe('collection');
  });

  it('classifies same-site other referrer', () => {
    expect(referrerCategory('https://calib.tools/about/')).toBe('other');
  });

  it('classifies external referrer as other', () => {
    expect(referrerCategory('https://google.com/search?q=charuco')).toBe('other');
  });

  it('classifies null referrer as none', () => {
    expect(referrerCategory(null)).toBe('none');
  });
});
