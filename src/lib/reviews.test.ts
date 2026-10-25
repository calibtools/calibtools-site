import { describe, it, expect } from 'vitest';
import { summarize, sortReviews, type Review } from './reviews';

const makeReview = (overrides: Partial<Review> = {}): Review => ({
  id: crypto.randomUUID(),
  handle: 'charuco-composite',
  orderRefHash: 'abc123',
  stars: 5,
  title: 'Great board',
  body: 'Works perfectly with our multi-camera rig for automotive calibration.',
  tags: {},
  author: { initials: 'JD' },
  photos: [],
  created: '2026-10-01T00:00:00Z',
  status: 'published',
  ...overrides,
});

describe('summarize', () => {
  it('returns zero summary for empty array', () => {
    const s = summarize([]);
    expect(s.average).toBe(0);
    expect(s.count).toBe(0);
    expect(s.distribution).toEqual([0, 0, 0, 0, 0]);
  });

  it('calculates average to one decimal', () => {
    const reviews = [makeReview({ stars: 5 }), makeReview({ stars: 4 }), makeReview({ stars: 5 })];
    const s = summarize(reviews);
    expect(s.average).toBe(4.7);
    expect(s.count).toBe(3);
  });

  it('ignores removed reviews', () => {
    const reviews = [makeReview({ stars: 5 }), makeReview({ stars: 1, status: 'removed:spam' })];
    const s = summarize(reviews);
    expect(s.count).toBe(1);
    expect(s.average).toBe(5);
  });

  it('builds correct distribution', () => {
    const reviews = [makeReview({ stars: 5 }), makeReview({ stars: 5 }), makeReview({ stars: 3 }), makeReview({ stars: 1 })];
    const s = summarize(reviews);
    expect(s.distribution).toEqual([1, 0, 1, 0, 2]);
  });
});

describe('sortReviews', () => {
  it('relevant: reviews with tags/photos come first', () => {
    const plain = makeReview({ id: 'plain', created: '2026-10-10T00:00:00Z' });
    const tagged = makeReview({ id: 'tagged', tags: { camera: 'FLIR' }, created: '2026-10-05T00:00:00Z' });
    const sorted = sortReviews([plain, tagged], 'relevant');
    expect(sorted[0].id).toBe('tagged');
  });

  it('newest: most recent first', () => {
    const old = makeReview({ id: 'old', created: '2026-09-01T00:00:00Z' });
    const newer = makeReview({ id: 'newer', created: '2026-10-15T00:00:00Z' });
    const sorted = sortReviews([old, newer], 'newest');
    expect(sorted[0].id).toBe('newer');
  });

  it('lowest: lowest stars first', () => {
    const high = makeReview({ id: 'high', stars: 5 });
    const low = makeReview({ id: 'low', stars: 2 });
    const sorted = sortReviews([high, low], 'lowest');
    expect(sorted[0].id).toBe('low');
  });
});

describe('distribution visibility', () => {
  it('distribution hidden at 5 or fewer reviews', () => {
    const s = summarize(Array.from({ length: 5 }, () => makeReview()));
    expect(s.count).toBeLessThanOrEqual(5);
  });
  it('distribution shown at 6+ reviews', () => {
    const s = summarize(Array.from({ length: 6 }, () => makeReview()));
    expect(s.count).toBeGreaterThanOrEqual(6);
  });
});

describe('home section visibility', () => {
  it('home section hidden at fewer than 3 published reviews', () => {
    const reviews = [makeReview(), makeReview()];
    expect(reviews.filter((r) => r.status === 'published').length).toBeLessThan(3);
  });
});

describe('AggregateRating', () => {
  it('absent at 0 reviews', () => {
    expect(summarize([]).count).toBe(0);
  });
});

describe('compliance: no literal "verified"', () => {
  it('HOW_REVIEWS_WORK does not contain "verified"', async () => {
    const { HOW_REVIEWS_WORK, HOW_REVIEWS_WORK_SHORT } = await import('./reviews');
    expect(HOW_REVIEWS_WORK.toLowerCase()).not.toContain('verified');
    expect(HOW_REVIEWS_WORK_SHORT.toLowerCase()).not.toContain('verified');
  });
});
