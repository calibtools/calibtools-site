/**
 * Guard: no hardcoded currency literals in src/ outside of allowed files.
 *
 * Fails if any file under src/ or src/docs/ contains a currency literal
 * (e.g. €123, $456) that is not sourced from prices.ts or Shopify.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(__dirname, '..');

/** Matches €NNN or $NNN (2–4 digits). */
const CURRENCY_RE = /[€$]\s?\d{2,4}/;

/** Files allowed to contain currency literals (relative to project root). */
const ALLOW_LIST = new Set([
  'src/lib/prices.ts',
  'src/lib/prices.test.ts',
  'src/lib/shopify.ts',
  'src/lib/shopify.test.ts',
  // VariantPicker has €150 shipping threshold (policy, not product price)
  'src/islands/VariantPicker.tsx',
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

describe('currency-literal guard', () => {
  it('no hardcoded currency outside allowed files', () => {
    const root = join(SRC, '..');
    const files = walk(SRC).filter((f) =>
      /\.(ts|tsx|astro|md|mdx)$/.test(f),
    );

    const violations: string[] = [];

    for (const abs of files) {
      const rel = relative(root, abs);
      if (ALLOW_LIST.has(rel)) continue;
      const content = readFileSync(abs, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (CURRENCY_RE.test(lines[i])) {
          violations.push(`${rel}:${i + 1}  ${lines[i].trim().slice(0, 80)}`);
        }
      }
    }

    expect(
      violations,
      `Currency literals found outside allowed files:\n${violations.join('\n')}`,
    ).toEqual([]);
  });
});
