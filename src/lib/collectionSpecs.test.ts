import { describe, test, expect } from 'vitest';
import { cornersCount, availabilityLabel, parseCollectionSections } from './collectionSpecs';

describe('cornersCount', () => {
  test('7×10 grid → 54 inner corners', () => {
    expect(cornersCount(7, 10)).toBe(54);
  });

  test('9×6 grid → 40 inner corners', () => {
    expect(cornersCount(9, 6)).toBe(40);
  });

  test('2×2 grid → 1 inner corner', () => {
    expect(cornersCount(2, 2)).toBe(1);
  });
});

describe('availabilityLabel', () => {
  test('returns lead_time when provided', () => {
    expect(availabilityLabel('5-7 business days', false)).toBe('5-7 business days');
  });

  test('returns "Made to order" when available and no lead_time', () => {
    expect(availabilityLabel(undefined, true)).toBe('Made to order');
  });

  test('returns "Made to order" when not available and no lead_time', () => {
    expect(availabilityLabel(undefined, false)).toBe('Made to order');
  });

  test('lead_time takes precedence over availableForSale', () => {
    expect(availabilityLabel('2-3 weeks', true)).toBe('2-3 weeks');
  });
});

describe('parseCollectionSections', () => {
  test('splits HTML by h2 headings', () => {
    const html = '<h2>Overview</h2><p>Intro text</p><h2>Specifications</h2><p>Specs here</p>';
    const result = parseCollectionSections(html);
    expect(result['Overview']).toBe('<p>Intro text</p>');
    expect(result['Specifications']).toBe('<p>Specs here</p>');
  });

  test('handles content before first h2', () => {
    const html = '<p>Preamble</p><h2>Section</h2><p>Body</p>';
    const result = parseCollectionSections(html);
    expect(result['']).toBe('<p>Preamble</p>');
    expect(result['Section']).toBe('<p>Body</p>');
  });

  test('handles h2 with attributes', () => {
    const html = '<h2 id="foo" class="bar">Title</h2><p>Content</p>';
    const result = parseCollectionSections(html);
    expect(result['Title']).toBe('<p>Content</p>');
  });

  test('returns empty object for empty string', () => {
    expect(parseCollectionSections('')).toEqual({});
  });
});
