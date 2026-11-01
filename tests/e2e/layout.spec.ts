/**
 * Layout regression test — L1–L9 audit assertions.
 *
 * Widths: 320, 360, 390, 414, 768, 1024, 1280, 1440, 1920, landscape 844×390.
 * Pages: 14 routes covering every template type.
 * Browsers: Chromium + WebKit + Firefox (configured in playwright.config.ts).
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGES = [
  '/', '/targets/', '/targets/collection/composite-boards/',
  '/targets/charuco-composite/', '/targets/charuco-ceramic/', '/targets/ir-board/',
  '/tools/', '/tools/generator/charuco/', '/tools/fov/',
  '/guides/', '/guides/multi-board-marker-ids/',
  '/quote/', '/faq/', '/cart/',
];

const WIDTHS = [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920];
const LANDSCAPE = { width: 844, height: 390 };

const SCREENSHOT_WIDTHS = [360, 768, 1440];
const SCREENSHOT_DIR = resolve(process.cwd(), 'docs/design/layout-audit-2026-11-01',
  process.env.LAYOUT_PHASE === 'after' ? 'after' : 'before');

// Elements that must be ≥ 44px tall below 768px
const TAP_TARGET_44_SEL = [
  'footer a',
  'nav[aria-label="Breadcrumb"] a',
  'nav[aria-label="Breadcrumb"] span',
  'summary',
  '[role="menuitem"]',
].join(', ');

// ─── Helpers ──────────────────────────────────────────────────────────

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const sw = document.documentElement.scrollWidth;
    const cw = document.documentElement.clientWidth;
    return { scrollWidth: sw, clientWidth: cw, overflow: sw - cw };
  });
}

async function smallInteractiveElements(page: Page, minSize: number) {
  return page.evaluate((min) => {
    const INTERACTIVE = 'a, button, input, select, textarea, summary, [role="button"], [role="tab"], [tabindex]';
    const els = Array.from(document.querySelectorAll(INTERACTIVE));
    const small: { tag: string; text: string; w: number; h: number }[] = [];
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue; // hidden
      // Exempt inline links inside paragraphs
      if (el.tagName === 'A' && el.parentElement?.tagName === 'P') continue;
      // Exempt cart drawer (off-screen)
      if (el.closest('[data-cart-drawer]')) continue;
      // Exempt lightbox (hidden dialog)
      if (el.closest('.lightbox-dialog')) continue;
      // Exempt hidden elements
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      if (rect.width < min || rect.height < min) {
        small.push({
          tag: `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}`,
          text: (el.textContent || '').trim().slice(0, 40),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        });
      }
    }
    return small;
  }, minSize);
}

async function textNodesBelowMinSize(page: Page, minPx: number) {
  return page.evaluate((min) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const violations: { text: string; fontSize: string; tag: string }[] = [];
    const seen = new Set<Element>();
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (!node.textContent?.trim()) continue;
      const parent = node.parentElement;
      if (!parent || seen.has(parent)) continue;
      seen.add(parent);
      // Exempt SVG internals
      if (parent.closest('svg')) continue;
      // Exempt hidden elements
      const style = window.getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const fs = parseFloat(style.fontSize);
      if (fs < min) {
        violations.push({
          text: node.textContent.trim().slice(0, 40),
          fontSize: style.fontSize,
          tag: parent.tagName.toLowerCase() + (parent.className ? '.' + String(parent.className).split(' ')[0] : ''),
        });
      }
    }
    return violations;
  }, minPx);
}

async function buttonHeights(page: Page) {
  return page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[class*="btn-md"], [class*="rounded-full"][href]'));
    const results: { text: string; h: number }[] = [];
    for (const btn of btns) {
      const rect = btn.getBoundingClientRect();
      if (rect.height === 0) continue;
      results.push({ text: (btn.textContent || '').trim().slice(0, 30), h: Math.round(rect.height) });
    }
    return results;
  });
}

async function tapTargets44(page: Page) {
  return page.evaluate((sel) => {
    const els = Array.from(document.querySelectorAll(sel));
    const small: { tag: string; text: string; h: number }[] = [];
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.height === 0 || rect.width === 0) continue;
      // Exempt hidden
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      // Exempt inline links inside paragraphs
      if (el.tagName === 'A' && el.parentElement?.tagName === 'P') continue;
      if (el.closest('[data-cart-drawer]') || el.closest('.lightbox-dialog')) continue;
      if (Math.round(rect.height) < 44) {
        small.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0, 40),
          h: Math.round(rect.height),
        });
      }
    }
    return small;
  }, TAP_TARGET_44_SEL);
}

async function fixedElementOverlap(page: Page) {
  return page.evaluate(() => {
    // Scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);
    // Wait a tick for any scroll-based show/hide
    return new Promise<{ overlapping: string[] }>((resolve) => {
      setTimeout(() => {
        const fixed = Array.from(document.querySelectorAll('*')).filter((el) => {
          const s = window.getComputedStyle(el);
          return (s.position === 'fixed' || s.position === 'sticky') && s.display !== 'none' && s.visibility !== 'hidden';
        });
        const focusable = Array.from(document.querySelectorAll('a, button, input, select, textarea, [tabindex]'));
        const overlapping: string[] = [];
        for (const f of fixed) {
          const fr = f.getBoundingClientRect();
          if (fr.width === 0 || fr.height === 0) continue;
          for (const t of focusable) {
            if (f.contains(t) || t.contains(f)) continue;
            const tr = t.getBoundingClientRect();
            if (tr.width === 0 || tr.height === 0) continue;
            // Check overlap
            if (fr.left < tr.right && fr.right > tr.left && fr.top < tr.bottom && fr.bottom > tr.top) {
              overlapping.push(`fixed "${(f.textContent || '').trim().slice(0, 20)}" overlaps "${(t.textContent || '').trim().slice(0, 20)}"`);
            }
          }
        }
        resolve({ overlapping: [...new Set(overlapping)].slice(0, 10) });
      }, 300);
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────

// Ensure screenshot dirs exist
try { mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch { /* exists */ }

for (const path of PAGES) {
  const slug = path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\//g, '-');

  // ── No horizontal overflow at all widths ──
  for (const w of WIDTHS) {
    test(`no overflow: ${slug} @ ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      const { overflow } = await noHorizontalOverflow(page);
      expect(overflow, `${slug} overflows by ${overflow}px at ${w}w`).toBeLessThanOrEqual(0);
    });
  }

  // Landscape
  test(`no overflow: ${slug} @ landscape ${LANDSCAPE.width}x${LANDSCAPE.height}`, async ({ page }) => {
    await page.setViewportSize(LANDSCAPE);
    await page.goto(path, { waitUntil: 'networkidle' });
    const { overflow } = await noHorizontalOverflow(page);
    expect(overflow, `${slug} overflows at landscape`).toBeLessThanOrEqual(0);
  });

  // ── Interactive elements ≥ 24×24 ──
  for (const w of [360, 768, 1440]) {
    test(`min 24px interactive: ${slug} @ ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      const small = await smallInteractiveElements(page, 24);
      expect(small, `Elements < 24px on ${slug} @ ${w}: ${JSON.stringify(small)}`).toHaveLength(0);
    });
  }

  // ── Below 768: tap targets ≥ 44px tall ──
  for (const w of [360, 390]) {
    test(`tap 44px: ${slug} @ ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      const small = await tapTargets44(page);
      expect(small, `Tap targets < 44px on ${slug} @ ${w}: ${JSON.stringify(small)}`).toHaveLength(0);
    });
  }

  // ── No text below 12px outside SVG ──
  for (const w of [360, 768, 1440]) {
    test(`min 12px text: ${slug} @ ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      const violations = await textNodesBelowMinSize(page, 12);
      expect(violations, `Text < 12px on ${slug} @ ${w}: ${JSON.stringify(violations)}`).toHaveLength(0);
    });
  }

  // ── Button-styled elements 40px tall ──
  test(`buttons 40px: ${slug} @ 1440`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path, { waitUntil: 'networkidle' });
    const btns = await buttonHeights(page);
    for (const b of btns) {
      expect(b.h, `Button "${b.text}" is ${b.h}px, expected 40 on ${slug}`).toBe(40);
    }
  });

  // ── Fixed element overlap at bottom ──
  for (const w of [375, 768]) {
    test(`no fixed overlap: ${slug} @ ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 812 });
      await page.goto(path, { waitUntil: 'networkidle' });
      const { overlapping } = await fixedElementOverlap(page);
      expect(overlapping, `Fixed overlap on ${slug} @ ${w}: ${overlapping.join('; ')}`).toHaveLength(0);
    });
  }

  // ── Screenshots at 360, 768, 1440 (Chromium only) ──
  for (const w of SCREENSHOT_WIDTHS) {
    test(`screenshot: ${slug} @ ${w}`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Screenshots only on Chromium');
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.screenshot({
        path: resolve(SCREENSHOT_DIR, `${slug}-${w}.png`),
        fullPage: true,
      });
    });
  }
}

// ── Product page: floating Add to cart hidden when in-page button visible ──
test('floating ATC hidden while in-page ATC visible @ 375', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/targets/charuco-composite/', { waitUntil: 'networkidle' });
  // The in-page Add to cart should be visible at the top
  const inPageBtn = page.locator('[data-buy-box] button:has-text("Add to cart"), [data-buy-box] a:has-text("Add to cart")').first();
  if (await inPageBtn.count() > 0 && await inPageBtn.isVisible()) {
    // If in-page button is visible, floating one should be hidden
    const floatingBtn = page.locator('.fixed button:has-text("Add to cart")');
    if (await floatingBtn.count() > 0) {
      expect(await floatingBtn.isVisible(), 'Floating ATC should be hidden when in-page ATC is visible').toBe(false);
    }
  }
});
