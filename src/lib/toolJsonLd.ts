/**
 * JSON-LD generators for tool pages.
 */

const SITE_URL = 'https://calib.tools';

export function toolJsonLd(
  toolName: string,
  url: string,
  description: string,
  faq: Array<{ q: string; a: string }>,
): Record<string, any>[] {
  const ld: Record<string, any>[] = [];

  // WebApplication
  ld.push({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: toolName,
    description,
    url: `${SITE_URL}${url}`,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    creator: {
      '@type': 'Organization',
      name: 'Calib.Tools',
      url: SITE_URL,
    },
  });

  // BreadcrumbList
  ld.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Free tools', item: `${SITE_URL}/tools/` },
      { '@type': 'ListItem', position: 3, name: toolName },
    ],
  });

  // FAQPage
  if (faq.length > 0) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    });
  }

  return ld;
}
