/**
 * SEO utilities: breadcrumb JSON-LD helper and Organization structured data.
 */

const SITE_URL = 'https://calib.tools';

export interface BreadcrumbItem {
  name: string;
  /** URL path (e.g. '/tools/'). Omit for the leaf (current page). */
  url?: string;
}

export function breadcrumbLd(items: BreadcrumbItem[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => {
      const entry: Record<string, any> = {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
      };
      if (item.url) {
        entry.item = `${SITE_URL}${item.url}`;
      }
      return entry;
    }),
  };
}

/** Path segments → human-readable names for auto-breadcrumbs. */
const SEGMENT_NAMES: Record<string, string> = {
  targets: 'Calibration targets',
  tools: 'Free tools',
  guides: 'Guides',
  collection: 'Collections',
  generator: 'Pattern generator',
  files: 'Files',
};

/**
 * Generate a BreadcrumbList from a URL pathname.
 * Returns null for home ('/') and 404.
 */
export function autoBreadcrumbLd(pathname: string, leafTitle: string): Record<string, any> | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/404') return null;

  const segments = clean.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ name: 'Home', url: '/' }];

  // Build intermediate crumbs
  for (let i = 0; i < segments.length - 1; i++) {
    const path = '/' + segments.slice(0, i + 1).join('/') + '/';
    const name = SEGMENT_NAMES[segments[i]] || segments[i].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({ name, url: path });
  }

  // Leaf (current page) — no URL
  items.push({ name: leafTitle });

  return breadcrumbLd(items);
}

export const ORGANIZATION_LD: Record<string, any> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Calib.Tools',
  url: SITE_URL,
  logo: `${SITE_URL}/android-chrome-512x512.png`,
  sameAs: ['https://github.com/calibtools'],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'hello@calib.tools',
    contactType: 'customer support',
  },
};
