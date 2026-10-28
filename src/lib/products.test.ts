import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { getProductData } from './productData';

/** Parse YAML-like frontmatter from a product content file (simple key: value). */
function parseFrontmatter(filePath: string): Record<string, unknown> {
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`No frontmatter in ${filePath}`);
  const fm: Record<string, unknown> = {};
  let currentKey = '';
  let currentValue = '';
  for (const line of match[1].split('\n')) {
    // Handle YAML array items
    if (line.match(/^\s+-\s/)) {
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      (fm[currentKey] as string[]).push(line.replace(/^\s+-\s*/, '').replace(/^["']|["']$/g, ''));
      continue;
    }
    const idx = line.indexOf(':');
    if (idx > 0) {
      currentKey = line.slice(0, idx).trim();
      currentValue = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      fm[currentKey] = currentValue;
    }
  }
  return fm;
}

function flattenSpecValues(handle: string): Set<string> {
  const data = getProductData(handle, {});
  if (!data) return new Set();
  const values = new Set<string>();
  for (const group of data.specGroups) {
    for (const row of group.rows) {
      values.add(row.value.toLowerCase().trim());
    }
  }
  return values;
}

const PRODUCTS_DIR = resolve(import.meta.dirname, '../content/products');
const HANDLES = ['charuco-composite', 'charuco-ceramic', 'checkerboard-composite', 'mounting-fixture', 'certificate-ilac'];

describe('product content: no spec value duplication', () => {
  for (const handle of HANDLES) {
    it(`${handle}: no frontmatter field repeats a datasheet spec value`, () => {
      const filePath = resolve(PRODUCTS_DIR, `${handle}.md`);
      if (!existsSync(filePath)) return; // Skip if not created yet

      const fm = parseFrontmatter(filePath);
      const specValues = flattenSpecValues(handle);
      if (specValues.size === 0) return;

      // Check summary doesn't contain exact spec values
      if (typeof fm.summary === 'string') {
        for (const sv of specValues) {
          expect(
            fm.summary.toLowerCase().includes(sv),
            `summary contains spec value "${sv}"`,
          ).toBe(false);
        }
      }

      // Check story doesn't contain exact spec values
      if (typeof fm.story === 'string') {
        for (const sv of specValues) {
          expect(
            fm.story.toLowerCase().includes(sv),
            `story contains spec value "${sv}"`,
          ).toBe(false);
        }
      }

      // decideSpecs must be keys (labels), not values
      if (Array.isArray(fm.decideSpecs)) {
        for (const key of fm.decideSpecs) {
          expect(
            specValues.has(String(key).toLowerCase().trim()),
            `decideSpecs entry "${key}" is a spec value, not a key`,
          ).toBe(false);
        }
      }
    });
  }
});
