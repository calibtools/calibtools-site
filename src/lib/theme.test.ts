import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('dark theme tokens', () => {
  it('brand-text (#FF3B47) on ground (#0A0A0A) meets WCAG AA (≥ 4.5:1)', () => {
    const ratio = contrastRatio('#FF3B47', '#0A0A0A');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('ink (#F2F2F2) on ground (#0A0A0A) meets WCAG AA', () => {
    const ratio = contrastRatio('#F2F2F2', '#0A0A0A');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('ink-muted (#A3A3A3) on ground (#0A0A0A) meets WCAG AA', () => {
    const ratio = contrastRatio('#A3A3A3', '#0A0A0A');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('round favicon', () => {
  it('favicon-32.png corner pixels are transparent (alpha 0)', () => {
    const result = execSync(
      `python3 -c "
from PIL import Image
img = Image.open('public/favicon/calib-tools-favicon-32.png').convert('RGBA')
w, h = img.size
corners = [img.getpixel((0,0)), img.getpixel((w-1,0)), img.getpixel((0,h-1)), img.getpixel((w-1,h-1))]
for c in corners:
    assert c[3] == 0, f'Corner alpha {c[3]} != 0'
print('OK')
"`,
      { encoding: 'utf-8', cwd: new URL('../..', import.meta.url).pathname },
    );
    expect(result.trim()).toBe('OK');
  });

  it('favicon-32.png centre pixel is black', () => {
    const result = execSync(
      `python3 -c "
from PIL import Image
img = Image.open('public/favicon/calib-tools-favicon-32.png').convert('RGBA')
w, h = img.size
c = img.getpixel((w//2, h//2))
assert c[3] == 255, f'Centre alpha {c[3]} != 255'
assert c[0] == 0 and c[1] == 0 and c[2] == 0, f'Centre not black: {c}'
print('OK')
"`,
      { encoding: 'utf-8', cwd: new URL('../..', import.meta.url).pathname },
    );
    expect(result.trim()).toBe('OK');
  });
});

describe('brand colour consistency', () => {
  it('no #E60113 remains in src/ or public/', () => {
    const result = execSync(
      'grep -r "#E60113" src/ public/ --include="*.svg" --include="*.astro" --include="*.tsx" --include="*.css" --include="*.mjs" | grep -v "theme.test.ts" || true',
      { encoding: 'utf-8', cwd: new URL('../..', import.meta.url).pathname },
    );
    expect(result.trim()).toBe('');
  });
});
