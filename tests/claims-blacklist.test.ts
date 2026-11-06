/**
 * Claims blacklist test — scans all customer-facing copy for banned phrases.
 *
 * Exits with failures listing file + line number for each hit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'node:fs';
import {
  BLACKLIST_RULES,
  blockedNameRules,
  type BlacklistRule,
} from '../src/lib/claims-blacklist';

// ---------- file discovery ----------

const ROOT = resolve(import.meta.dirname, '..');

/** Glob for customer-facing source files. */
function customerFiles(): string[] {
  const patterns = [
    'src/**/*.astro',
    'src/**/*.md',
    'src/**/*.mdx',
    'src/lib/*.ts',
    'src/docs/**/*.ts',
  ];
  const files = new Set<string>();
  for (const p of patterns) {
    for (const f of globSync(p, { cwd: ROOT })) {
      // Skip test files, __tests__ dirs, and the blacklist rules file itself
      if (f.includes('.test.') || f.includes('__tests__') || f.endsWith('claims-blacklist.ts')) continue;
      files.add(f);
    }
  }
  return [...files].sort();
}

// ---------- string extraction ----------

/**
 * For .ts files in src/lib and src/docs, extract only string-literal content
 * (single-quoted, double-quoted, and template literals) so we don't flag
 * variable names, comments about the rules, etc.
 */
function extractStrings(content: string): { line: number; text: string }[] {
  const results: { line: number; text: string }[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match string literals — simplified but sufficient for our copy
    const re = /(?:'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)")/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const text = m[1] ?? m[2];
      if (text && text.length > 3) {
        results.push({ line: i + 1, text });
      }
    }
    // Template literal fragments on this line
    const tpl = /`([^`\\]*(?:\\.[^`\\]*)*)`/g;
    let t: RegExpExecArray | null;
    while ((t = tpl.exec(line)) !== null) {
      if (t[1] && t[1].length > 3) {
        results.push({ line: i + 1, text: t[1] });
      }
    }
  }
  return results;
}

// ---------- scanning ----------

interface Violation {
  file: string;
  line: number;
  rule: string;
  text: string;
}

function scan(rules: BlacklistRule[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of customerFiles()) {
    const abs = resolve(ROOT, file);
    const content = readFileSync(abs, 'utf-8');
    const isTs = file.endsWith('.ts');

    // Skip draft content (not customer-facing)
    const isMdLike = file.endsWith('.md') || file.endsWith('.mdx');
    if (isMdLike && /^draft:\s*true/m.test(content)) continue;

    if (isTs) {
      // Only scan string literals in .ts files
      for (const { line, text } of extractStrings(content)) {
        for (const rule of rules) {
          if (rule.pattern.test(text)) {
            violations.push({ file, line, rule: rule.label, text: text.slice(0, 80) });
          }
        }
      }
    } else {
      // For .astro / .md / .mdx, scan every line
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const rule of rules) {
          if (rule.pattern.test(lines[i])) {
            violations.push({ file, line: i + 1, rule: rule.label, text: lines[i].trim().slice(0, 80) });
          }
        }
      }
    }
  }
  return violations;
}

// ---------- test ----------

describe('claims blacklist', () => {
  const allRules = [...BLACKLIST_RULES, ...blockedNameRules()];

  it('no customer-facing file contains blacklisted phrases', () => {
    const violations = scan(allRules);
    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} — ${v.rule}\n    ${v.text}`)
        .join('\n');
      expect.fail(`${violations.length} blacklist violation(s):\n${report}`);
    }
  });
});
