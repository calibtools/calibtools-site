import { describe, it, expect } from 'vitest';
import { toolJsonLd } from './toolJsonLd';

describe('toolJsonLd', () => {
  const faq = [
    { q: 'Is it free?', a: 'Yes, completely free.' },
    { q: 'Does it upload data?', a: 'No, everything runs in your browser.' },
  ];

  it('returns WebApplication, BreadcrumbList, and FAQPage', () => {
    const ld = toolJsonLd('Pattern generator', '/tools/generator/', 'Generate patterns', faq);
    expect(ld).toHaveLength(3);
    expect(ld[0]['@type']).toBe('WebApplication');
    expect(ld[1]['@type']).toBe('BreadcrumbList');
    expect(ld[2]['@type']).toBe('FAQPage');
  });

  it('WebApplication has correct fields', () => {
    const ld = toolJsonLd('FOV calculator', '/tools/fov/', 'Calculate FOV', faq);
    const app = ld[0];
    expect(app.name).toBe('FOV calculator');
    expect(app.applicationCategory).toBe('DeveloperApplication');
    expect(app.operatingSystem).toBe('Web');
    expect(app.offers.price).toBe('0');
    expect(app.offers.priceCurrency).toBe('EUR');
    expect(app.url).toBe('https://calib.tools/tools/fov/');
  });

  it('BreadcrumbList has 3 items', () => {
    const ld = toolJsonLd('Wizard', '/tools/wizard/', 'Select a target', []);
    const bc = ld[1];
    expect(bc.itemListElement).toHaveLength(3);
    expect(bc.itemListElement[0].name).toBe('Home');
    expect(bc.itemListElement[2].name).toBe('Wizard');
  });

  it('skips FAQPage when no FAQ items', () => {
    const ld = toolJsonLd('Test', '/tools/test/', 'desc', []);
    expect(ld).toHaveLength(2);
    expect(ld.every((item: any) => item['@type'] !== 'FAQPage')).toBe(true);
  });

  it('FAQPage contains questions and answers', () => {
    const ld = toolJsonLd('Gen', '/tools/gen/', 'desc', faq);
    const faqLd = ld[2];
    expect(faqLd.mainEntity).toHaveLength(2);
    expect(faqLd.mainEntity[0]['@type']).toBe('Question');
    expect(faqLd.mainEntity[0].name).toBe('Is it free?');
    expect(faqLd.mainEntity[0].acceptedAnswer.text).toBe('Yes, completely free.');
  });
});
