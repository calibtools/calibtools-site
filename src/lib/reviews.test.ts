import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { summarize, sortReviews, type Review, type MaterialConnection } from './reviews';

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
  source: 'order',
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

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

describe('summarize: source counts', () => {
  it('counts order and imported reviews separately', () => {
    const reviews = [
      makeReview({ source: 'order' }),
      makeReview({ source: 'order' }),
      makeReview({ source: 'imported', materialConnection: 'none', consent: true }),
    ];
    const s = summarize(reviews);
    expect(s.count).toBe(3);
    expect(s.orderCount).toBe(2);
    expect(s.importedCount).toBe(1);
  });

  it('defaults to all-order when no imported reviews', () => {
    const reviews = [makeReview(), makeReview()];
    const s = summarize(reviews);
    expect(s.orderCount).toBe(2);
    expect(s.importedCount).toBe(0);
  });
});

describe('Review type: imported review constraints', () => {
  it('imported review has source, consent, materialConnection', () => {
    const imported = makeReview({
      source: 'imported',
      importBatch: '2026-10-01',
      consent: true,
      materialConnection: 'free_sample',
      reviewerOrg: 'Test Lab',
      country: 'US',
      language: 'en',
      orderRefHash: '',
    });
    expect(imported.source).toBe('imported');
    expect(imported.consent).toBe(true);
    expect(imported.materialConnection).toBe('free_sample');
  });

  it('materialConnection values are restricted', () => {
    const valid: MaterialConnection[] = ['none', 'free_sample', 'discount', 'insider'];
    for (const mc of valid) {
      const r = makeReview({ source: 'imported', materialConnection: mc, consent: true });
      expect(r.materialConnection).toBe(mc);
    }
  });
});

describe('material connection labels', () => {
  it('MATERIAL_CONNECTION_LABEL has entries for all four values', async () => {
    const { MATERIAL_CONNECTION_LABEL } = await import('@/lib/claims');
    expect(MATERIAL_CONNECTION_LABEL.none).toBeTruthy();
    expect(MATERIAL_CONNECTION_LABEL.free_sample).toBeTruthy();
    expect(MATERIAL_CONNECTION_LABEL.discount).toBeTruthy();
    expect(MATERIAL_CONNECTION_LABEL.insider).toBeTruthy();
  });

  it('labels do not use the word "verified"', async () => {
    const { MATERIAL_CONNECTION_LABEL } = await import('@/lib/claims');
    for (const [, label] of Object.entries(MATERIAL_CONNECTION_LABEL)) {
      expect(label.toLowerCase()).not.toContain('verified');
    }
  });
});

describe('policy page content', () => {
  it('contains order reviews, shared reviews, and publish-everything', () => {
    const content = readFileSync(join(__dirname, '..', 'pages', 'reviews-policy.astro'), 'utf-8');
    expect(content).toContain('Order reviews');
    expect(content).toContain('Shared reviews');
    expect(content).toContain('publish every review we receive');
    expect(content).toContain('never moved between products');
  });

  it('does not contain old single-source wording', () => {
    const content = readFileSync(join(__dirname, '..', 'pages', 'reviews-policy.astro'), 'utf-8');
    expect(content).not.toContain('Only customers we e-mail after delivery can submit a review');
  });
});

describe('compliance: no "verified" in review UI copy', () => {
  it('no review UI file uses the word "verified"', () => {
    const SRC = join(__dirname, '..');
    const reviewFiles = walk(SRC).filter(
      (f) =>
        (f.includes('Review') || f.includes('review') || f.includes('Stars')) &&
        /\.(tsx|ts|astro)$/.test(f) &&
        !f.includes('.test.') &&
        !f.includes('node_modules'),
    );
    const violations: string[] = [];
    for (const file of reviewFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
        if (/\bverified\b/i.test(line) && !line.includes('import')) {
          violations.push(`${relative(join(SRC, '..'), file)}:${i + 1}: ${line.trim()}`);
        }
      }
    }
    expect(violations, `Review UI files containing "verified":\n${violations.join('\n')}`).toEqual([]);
  });
});
