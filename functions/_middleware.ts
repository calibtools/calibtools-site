/**
 * Cloudflare Pages middleware.
 *
 * 1. 301 redirect www → apex (runs first, unchanged).
 * 2. Anonymous page-view counter via Analytics Engine.
 *
 * Counting rules — a request is counted only when ALL of these hold:
 *   - Method is GET
 *   - Accept header contains text/html
 *   - Path is not an asset prefix or file extension
 *   - Not a prefetch (Sec-Purpose / Purpose header)
 *   - User-Agent does not match a known bot pattern
 *   - Response status is 200
 *
 * Stored fields (exhaustive):
 *   blobs:   [pathname, referrerCategory]
 *   doubles: [1]
 *   indexes: [pathname]
 *
 * NOT stored: IP, User-Agent, cookies, visitor identifiers.
 */

const BOT_RE = /bot|crawl|spider|slurp|preview|monitor|curl|wget|python|headless/i;

const SKIP_PREFIXES = ['/_astro/', '/fonts/', '/brand/', '/api/', '/files/', '/og/'];
const FILE_EXT_RE = /\.[a-z0-9]{1,5}$/i;

/** Classify a same-site referrer into a page category. */
export function referrerCategory(referer: string | null): string {
  if (!referer) return 'none';
  try {
    const url = new URL(referer);
    if (url.hostname !== 'calib.tools' && url.hostname !== 'www.calib.tools') {
      return 'other';
    }
    const path = url.pathname;
    if (path.startsWith('/tools/generator/')) return 'generator';
    if (path.startsWith('/guides/')) return 'guide';
    if (path.startsWith('/targets/collection/')) return 'collection';
    return 'other';
  } catch {
    return 'other';
  }
}

interface AEDataset {
  writeDataPoint(data: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
}

/** Exported for testing: determine whether a request should be counted. */
export function shouldCount(
  request: Request,
  responseStatus: number,
): boolean {
  if (request.method !== 'GET') return false;
  if (!request.headers.get('accept')?.includes('text/html')) return false;

  const pathname = new URL(request.url).pathname;
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  if (FILE_EXT_RE.test(pathname)) return false;

  const purpose = request.headers.get('sec-purpose') || request.headers.get('purpose') || '';
  if (purpose.toLowerCase().includes('prefetch')) return false;

  const ua = request.headers.get('user-agent') || '';
  if (BOT_RE.test(ua)) return false;

  if (responseStatus !== 200) return false;

  return true;
}

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // ── 1. www → apex 301 ──
  if (url.hostname.startsWith('www.')) {
    url.hostname = url.hostname.replace(/^www\./, '');
    return new Response(null, {
      status: 301,
      headers: { Location: url.toString() },
    });
  }

  // ── 2. Serve the request first ──
  const response = await context.next();

  // ── 3. Decide whether to count ──
  if (shouldCount(context.request, response.status)) {
    const pageViews = (context.env as Record<string, unknown>).PAGE_VIEWS as AEDataset | undefined;
    if (pageViews) {
      const pathname = url.pathname;
      const category = referrerCategory(context.request.headers.get('referer'));
      context.waitUntil(
        Promise.resolve(
          pageViews.writeDataPoint({
            blobs: [pathname, category],
            doubles: [1],
            indexes: [pathname],
          }),
        ),
      );
    }
  }

  return response;
};
