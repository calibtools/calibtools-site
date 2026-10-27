import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RETURNS_LINE } from './claims';

const ROOT = resolve(import.meta.dirname, '../..');

describe('RETURNS_LINE constant', () => {
  it('is used in index.astro', () => {
    const src = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf-8');
    expect(src).toContain('RETURNS_LINE');
    // Also import check
    expect(src).toContain("import { TAGLINE, IN_DEVELOPMENT, RETURNS_LINE } from '@/lib/claims'");
  });

  it('is used in returns.astro', () => {
    const src = readFileSync(resolve(ROOT, 'src/pages/returns.astro'), 'utf-8');
    expect(src).toContain('RETURNS_LINE');
    expect(src).toContain("import { RETURNS_LINE } from '@/lib/claims'");
  });

  it('neither page has the inline copy', () => {
    const indexSrc = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf-8');
    const returnsSrc = readFileSync(resolve(ROOT, 'src/pages/returns.astro'), 'utf-8');
    // The literal string should not appear inline (only via the constant)
    const literal = 'Not flat, not accurate, not what you ordered';
    // index.astro should not have the literal as a string (only RETURNS_LINE)
    expect(indexSrc).not.toContain(`'${literal}`);
    // returns.astro should not have the full literal inline
    expect(returnsSrc).not.toContain(`${literal} —`);
    expect(returnsSrc).not.toContain(`${literal} \u2014`);
  });
});
