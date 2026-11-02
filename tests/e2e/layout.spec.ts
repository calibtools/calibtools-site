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
const SCREENSHOTS_ENABLED = process.env.LAYOUT_SCREENSHOTS === '1';
const SCREENSHOT_DIR = resolve(process.cwd(), 'docs/design/layout-audit-2026-11-01',
  process.env.LAYOUT_PHASE === 'before' ? 'before' : 'after');

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
    /** Check if an element is inside a hidden/inert ancestor */
    function isEffectivelyHidden(el: Element): boolean {
      let cur: Element | null = el;
      while (cur) {
        if (cur.hasAttribute('inert')) return true;
        if (cur.getAttribute('aria-hidden') === 'true') return true;
        const s = window.getComputedStyle(cur);
        if (s.visibility === 'hidden' || s.display === 'none') return true;
        cur = cur.parentElement;
      }
      return false;
    }
    /** Check if an element is visually hidden (sr-only, clip, 1×1) */
    function isVisuallyHidden(el: Element): boolean {
      const s = window.getComputedStyle(el);
      if (s.position === 'absolute' && s.overflow === 'hidden' &&
          (s.clip !== 'auto' || s.clipPath === 'inset(50%)') &&
          (parseInt(s.width) <= 1 || parseInt(s.height) <= 1)) return true;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 && r.height <= 1) return true;
      return false;
    }

    const INTERACTIVE = 'a, button, input, select, textarea, summary, [role="button"], [role="tab"], [tabindex]';
    const els = Array.from(document.querySelectorAll(INTERACTIVE));
    const small: { tag: string; text: string; w: number; h: number }[] = [];
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue; // hidden
      // Exempt inline links inside prose text (paragraphs, list items, table cells)
      if (el.tagName === 'A') {
        const p = el.parentElement;
        if (p && ['P', 'LI', 'TD', 'DD', 'BLOCKQUOTE'].includes(p.tagName)) continue;
        if (el.closest('.prose-calib')) continue;
      }
      // Exempt off-screen drawers and lightbox
      if (el.closest('[data-cart-drawer]') || el.closest('[class*="CartDrawer"]')) continue;
      if (el.closest('.lightbox-dialog')) continue;
      // Exempt elements horizontally off-screen
      if (rect.right < 0 || rect.left > window.innerWidth) continue;
      // Exempt elements inside inert, aria-hidden, visibility:hidden, or display:none ancestors
      if (isEffectivelyHidden(el)) continue;
      // Exempt hidden elements (self)
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      // Exempt visually hidden elements (sr-only, clip, 1×1)
      if (isVisuallyHidden(el)) continue;
      // Exempt checkbox/radio inputs when their enclosing label is checked by the label-row rule
      if (el.tagName === 'INPUT') {
        const inp = el as HTMLInputElement;
        if (inp.type === 'checkbox' || inp.type === 'radio') {
          if (inp.closest('label')) continue;
        }
      }
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
      // Exempt visually hidden (sr-only, clip, 1×1)
      if (style.position === 'absolute' && style.overflow === 'hidden' &&
          (style.clip !== 'auto' || style.clipPath === 'inset(50%)') &&
          (parseInt(style.width) <= 1 || parseInt(style.height) <= 1)) continue;
      if (rect.width <= 1 && rect.height <= 1) continue;
      // Exempt inline links inside paragraphs
      if (el.tagName === 'A' && el.parentElement?.tagName === 'P') continue;
      if (el.closest('[data-cart-drawer]') || el.closest('.lightbox-dialog')) continue;
      // Exempt elements horizontally off-screen
      if (rect.right < 0 || rect.left > window.innerWidth) continue;
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
        const vh = window.innerHeight;
        const vw = window.innerWidth;

        // Find the sticky top nav: the first sticky nav at top:0
        const stickyTopNav = document.querySelector('nav[data-nav-bar]') as Element | null;

        // Find fixed/sticky elements that are visible and on-screen
        const fixed: Element[] = [];
        // Only check elements that are likely fixed/sticky (much faster than querySelectorAll('*'))
        const candidates = document.querySelectorAll('[class*="fixed"], [class*="sticky"], [style*="position"]');
        for (const el of candidates) {
          const s = window.getComputedStyle(el);
          if (s.position !== 'fixed' && s.position !== 'sticky') continue;
          if (s.display === 'none' || s.visibility === 'hidden') continue;
          if (s.opacity === '0' || s.pointerEvents === 'none') continue;
          // Exempt the sticky top nav
          if (el === stickyTopNav || (stickyTopNav && stickyTopNav.contains(el))) continue;
          if (el.tagName === 'HEADER' || el.closest('header')) continue;
          // Exempt fixed elements fully off-screen (e.g. translated-away drawers)
          const fr = el.getBoundingClientRect();
          if (fr.right <= 0 || fr.left >= vw || fr.bottom <= 0 || fr.top >= vh) continue;
          if (fr.width === 0 || fr.height === 0) continue;
          fixed.push(el);
        }

        // Check ALL focusable elements in the last screenful (footer included)
        const focusable = Array.from(document.querySelectorAll('a, button, input, select, textarea, [tabindex]'))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.height <= 0 || r.width <= 0) return false;
            if (r.top >= vh || r.bottom <= 0) return false;
            // Exclude elements inside the sticky top nav
            if (stickyTopNav && stickyTopNav.contains(el)) return false;
            return true;
          });

        const overlapping: string[] = [];
        for (const f of fixed) {
          const fr = f.getBoundingClientRect();
          for (const t of focusable) {
            // Exclude descendants of the fixed element itself
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

// Ensure screenshot dirs exist (only when screenshots are enabled)
if (SCREENSHOTS_ENABLED) {
  try { mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch { /* exists */ }
}

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

  // ── Below 768: checkbox/radio label rows ≥ 44px tall ──
  for (const w of [360, 390]) {
    test(`checkbox label 44px: ${slug} @ ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      const small = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[type="checkbox"], input[type="radio"]'));
        const violations: { text: string; h: number }[] = [];
        for (const input of inputs) {
          // Skip visually hidden inputs (sr-only, clip, 1×1)
          const is = window.getComputedStyle(input);
          if (is.position === 'absolute' && is.overflow === 'hidden' &&
              (is.clip !== 'auto' || is.clipPath === 'inset(50%)') &&
              (parseInt(is.width) <= 1 || parseInt(is.height) <= 1)) continue;
          const ir = input.getBoundingClientRect();
          if (ir.width <= 1 && ir.height <= 1) continue;
          const label = input.closest('label');
          if (!label) continue;
          const rect = label.getBoundingClientRect();
          if (rect.height === 0) continue;
          const style = window.getComputedStyle(label);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          if (Math.round(rect.height) < 44) {
            violations.push({
              text: (label.textContent || '').trim().slice(0, 40),
              h: Math.round(rect.height),
            });
          }
        }
        return violations;
      });
      expect(small, `Checkbox labels < 44px on ${slug} @ ${w}: ${JSON.stringify(small)}`).toHaveLength(0);
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

  // ── Screenshots at 360, 768, 1440 (Chromium only, opt-in) ──
  for (const w of SCREENSHOT_WIDTHS) {
    test(`screenshot: ${slug} @ ${w}`, async ({ page, browserName }) => {
      test.skip(!SCREENSHOTS_ENABLED, 'Set LAYOUT_SCREENSHOTS=1 to capture');
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
  // Wait for React hydration and IntersectionObserver to fire
  await page.waitForTimeout(500);

  // Locate the floating bottom cluster (the fixed container with the ATC button)
  const cluster = page.locator('.fixed.bottom-3.z-30').first();
  if (await cluster.count() === 0) return; // no cluster on this page

  // While in-page buy-box is in view, the cluster must be hidden
  const buyBox = page.locator('[data-buy-box]').first();
  if (await buyBox.count() > 0 && await buyBox.isVisible()) {
    const hidden = await cluster.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return s.opacity === '0' || s.visibility === 'hidden' || s.pointerEvents === 'none';
    });
    expect(hidden, 'Floating ATC should be hidden when buy-box is in view').toBe(true);
  }

  // After scrolling past the buy-box, the cluster must be visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);

  const visible = await cluster.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return s.opacity !== '0' && s.visibility !== 'hidden' && s.pointerEvents !== 'none';
  });
  expect(visible, 'Floating ATC should be visible after scrolling past buy-box').toBe(true);
});
