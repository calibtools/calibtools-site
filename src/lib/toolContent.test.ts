import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Tests that all tool content files exist and have valid frontmatter.
 * Does not use Astro's content collection API (vitest doesn't load it).
 */
const TOOLS_DIR = resolve('src/content/tools');
const REQUIRED_KEYS = ['generator', 'fov', 'wizard', 'convert', 'check', 'quality', 'capture'];

describe('tool content files', () => {
  it('all required tool content files exist', () => {
    const files = readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.md'));
    for (const key of REQUIRED_KEYS) {
      expect(files).toContain(`${key}.md`);
    }
  });

  for (const key of REQUIRED_KEYS) {
    it(`${key}.md has valid frontmatter`, () => {
      const raw = readFileSync(resolve(TOOLS_DIR, `${key}.md`), 'utf-8');
      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
      expect(fmMatch).not.toBeNull();
      const fm = fmMatch![1];
      expect(fm).toContain('seoTitle:');
      expect(fm).toContain('seoDescription:');
      expect(fm).toContain('h1:');
      expect(fm).toContain('faq:');
    });

    it(`${key}.md has body content with expected sections`, () => {
      const raw = readFileSync(resolve(TOOLS_DIR, `${key}.md`), 'utf-8');
      expect(raw).toContain('## What it does');
      expect(raw).toContain('## How to use it');
    });
  }
});

describe('preset content files', () => {
  const PRESETS = ['generator-charuco', 'generator-checkerboard', 'generator-aprilgrid', 'generator-circles'];

  it('all preset files exist', () => {
    const files = readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.md'));
    for (const key of PRESETS) {
      expect(files).toContain(`${key}.md`);
    }
  });
});
