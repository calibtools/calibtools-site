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

export const ORGANIZATION_LD: Record<string, any> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Calib.Tools',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  sameAs: ['https://github.com/calibtools'],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'hello@calib.tools',
    contactType: 'customer support',
  },
};
