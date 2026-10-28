import { describe, it, expect } from 'vitest';
import { breadcrumbLd, autoBreadcrumbLd, ORGANIZATION_LD } from './seo';

describe('breadcrumbLd', () => {
  it('returns BreadcrumbList with correct structure', () => {
    const ld = breadcrumbLd([
      { name: 'Home', url: '/' },
      { name: 'Tools', url: '/tools/' },
      { name: 'Generator' },
    ]);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toHaveLength(3);
  });

  it('sets position starting at 1', () => {
    const ld = breadcrumbLd([{ name: 'Home', url: '/' }, { name: 'About' }]);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].position).toBe(2);
  });

  it('includes item URL for non-leaf items, omits for leaf', () => {
    const ld = breadcrumbLd([
      { name: 'Home', url: '/' },
      { name: 'Leaf' },
    ]);
    expect(ld.itemListElement[0].item).toBe('https://calib.tools/');
    expect(ld.itemListElement[1].item).toBeUndefined();
  });

  it('prepends site URL to relative paths', () => {
    const ld = breadcrumbLd([{ name: 'Tools', url: '/tools/' }, { name: 'X' }]);
    expect(ld.itemListElement[0].item).toBe('https://calib.tools/tools/');
  });
});

describe('autoBreadcrumbLd', () => {
  it('returns null for home page', () => {
    expect(autoBreadcrumbLd('/', 'Home')).toBeNull();
  });

  it('returns null for 404', () => {
    expect(autoBreadcrumbLd('/404', 'Not found')).toBeNull();
  });

  it('generates breadcrumbs for a tool page', () => {
    const ld = autoBreadcrumbLd('/tools/generator/', 'Pattern generator');
    expect(ld).not.toBeNull();
    expect(ld!['@type']).toBe('BreadcrumbList');
    expect(ld!.itemListElement).toHaveLength(3);
    expect(ld!.itemListElement[0].name).toBe('Home');
    expect(ld!.itemListElement[1].name).toBe('Free tools');
    expect(ld!.itemListElement[2].name).toBe('Pattern generator');
  });

  it('generates breadcrumbs for a nested page', () => {
    const ld = autoBreadcrumbLd('/targets/collection/composite-boards/', 'Composite boards');
    expect(ld).not.toBeNull();
    expect(ld!.itemListElement).toHaveLength(4);
  });
});

describe('ORGANIZATION_LD', () => {
  it('has required fields', () => {
    expect(ORGANIZATION_LD['@type']).toBe('Organization');
    expect(ORGANIZATION_LD.name).toBe('Calib.Tools');
    expect(ORGANIZATION_LD.url).toBe('https://calib.tools');
  });

  it('has sameAs with GitHub org URL', () => {
    expect(ORGANIZATION_LD.sameAs).toContain('https://github.com/calibtools');
  });

  it('has contactPoint with email', () => {
    expect(ORGANIZATION_LD.contactPoint.email).toBe('hello@calib.tools');
  });

  it('does not contain address or city', () => {
    expect(ORGANIZATION_LD.address).toBeUndefined();
    const json = JSON.stringify(ORGANIZATION_LD);
    expect(json).not.toContain('"address"');
    expect(json).not.toContain('"city"');
  });
});
