/**
 * Cloudflare Worker: anonymous page-view counter.
 *
 * Deployed as a Pages Function or standalone Worker.
 * Uses Cloudflare Analytics Engine for aggregation.
 *
 * What is stored (exhaustive list):
 *   - blob1: page pathname  (e.g. "/tools/generator/charuco/")
 *   - blob2: referrer category ("generator" | "guide" | "collection" | "other" | "none")
 *   - double1: 1 (counter increment)
 *
 * What is NOT stored:
 *   - No IP addresses
 *   - No User-Agent strings
 *   - No visitor identifiers
 *   - No cookies set or read
 *   - No localStorage or sessionStorage written
 *   - No cross-page session stitching
 *
 * The Worker runs on every page request. It classifies the Referer
 * header into a category, writes one row to Analytics Engine, and
 * passes the request through to the origin unchanged.
 */

interface AnalyticsEngineDataPoint {
  blobs?: string[];
  doubles?: number[];
  indexes?: string[];
}

interface AnalyticsEngineDatasetBinding {
  writeDataPoint(data: AnalyticsEngineDataPoint): void;
}

interface Env {
  PAGE_VIEWS: AnalyticsEngineDatasetBinding;
}

/** Classify a referrer URL into a page category. */
function referrerCategory(referer: string | null): string {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only count HTML page views, not assets
    const pathname = url.pathname;
    if (
      pathname.startsWith('/_astro/') ||
      pathname.startsWith('/fonts/') ||
      pathname.startsWith('/brand/') ||
      pathname.match(/\.(js|css|png|jpg|webp|avif|svg|ico|woff2|json|xml|txt)$/)
    ) {
      return fetch(request);
    }

    // Write one event to Analytics Engine
    const referer = request.headers.get('referer');
    const category = referrerCategory(referer);

    env.PAGE_VIEWS.writeDataPoint({
      blobs: [pathname, category],
      doubles: [1],
    });

    // Pass through to origin
    return fetch(request);
  },
};
