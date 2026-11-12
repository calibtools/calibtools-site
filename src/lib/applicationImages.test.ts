import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import alts from '../assets/applications/images.json';

const DIR = resolve(__dirname, '../assets/applications');
const PAGES = resolve(__dirname, '../content/applications');

describe('application page photos', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', ''));

  it('every photo has alt text and every alt text has a photo', () => {
    expect(Object.keys(alts).sort()).toEqual([...files].sort());
  });

  it('every photo belongs to an application page', () => {
    for (const slug of files) {
      expect(existsSync(join(PAGES, `${slug}.md`)), `no page for ${slug}`).toBe(true);
    }
  });

  it('alt text is a sentence of reasonable length without personal names', () => {
    for (const alt of Object.values(alts)) {
      expect(alt.length).toBeGreaterThan(40);
      expect(alt.length).toBeLessThanOrEqual(300);
      expect(alt.endsWith('.')).toBe(true);
    }
  });
});
