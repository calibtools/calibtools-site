import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * CONTRAST-1 guard: text-brand-dark must not appear inside a dark-themed file.
 *
 * A file has dark context if it contains theme="dark" or a dark background class.
 * Any line in such a file that uses text-brand-dark is a violation.
 */

const DARK_PATTERNS = [
  /theme\s*=\s*["']dark["']/,
  /bg-\[#0[Aa]0[Aa]0[Aa]\]/,
  /bg-\[#111111\]/,
];

/** Recursively collect files matching extensions. */
function walk(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...walk(full, exts));
    } else if (entry.isFile() && exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

describe('CONTRAST guard: no text-brand-dark on dark surfaces', () => {
  it('no file with a dark container uses text-brand-dark', () => {
    const root = join(process.cwd(), 'src');
    const files = walk(root, ['.astro', '.tsx', '.jsx']);

    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      if (!content.includes('text-brand-dark')) continue;

      const hasDarkContext = DARK_PATTERNS.some((p) => p.test(content));
      if (!hasDarkContext) continue;

      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('text-brand-dark')) {
          const rel = relative(process.cwd(), file);
          violations.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`);
        }
      });
    }

    expect(
      violations,
      `text-brand-dark found in dark-context files:\n${violations.join('\n')}`,
    ).toEqual([]);
  });
});
