#!/usr/bin/env node
/**
 * measure-nav.mjs — Measure every nav/footer element's computed typography.
 *
 * Usage:
 *   node scripts/measure-nav.mjs [--url URL] [--viewports 1280,1440,1920,390] [--out path.json]
 *
 * Outputs JSON with per-element measurements and a markdown summary table.
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const url = getArg('--url', 'http://localhost:4321');
const viewports = getArg('--viewports', '1280,1440,1920,390').split(',').map(Number);
const outJson = getArg('--out', 'docs/design/nav-metrics-before.json');
const outMd = outJson.replace('.json', '.md');

// WCAG relative luminance
function sRGBtoLinear(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(r, g, b) {
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}
function parseColor(str) {
  // Parse rgb(r, g, b) or rgba(r, g, b, a)
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return [0, 0, 0];
}

async function measurePage(page, vw) {
  await page.setViewportSize({ width: vw, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Open mega-menu for measurement if desktop
  if (vw >= 1024) {
    const trigger = page.locator('[data-nav-trigger]').first();
    if (await trigger.count()) {
      await trigger.hover();
      await page.waitForTimeout(200);
    }
  }

  const results = await page.evaluate(() => {
    function getProps(el) {
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().slice(0, 60) || '',
        fontFamily: s.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        textTransform: s.textTransform,
        color: s.color,
        backgroundColor: s.backgroundColor,
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10,
        x: Math.round(box.x * 10) / 10,
        y: Math.round(box.y * 10) / 10,
      };
    }

    const items = [];

    // Header nav
    const nav = document.querySelector('nav[aria-label="Main"]');
    if (nav) {
      items.push({ role: 'header-bar', ...getProps(nav) });

      // Nav links/buttons
      nav.querySelectorAll('a, button').forEach(el => {
        if (el.closest('[data-nav-panel]') || el.closest('[data-mobile-drawer]')) return;
        if (!el.textContent?.trim()) return;
        items.push({ role: 'header-item', ...getProps(el) });
      });

      // Mega-menu elements
      nav.querySelectorAll('[data-nav-panel]').forEach(panel => {
        if (getComputedStyle(panel).display === 'none') return;
        panel.querySelectorAll('div, a, span').forEach(el => {
          if (!el.textContent?.trim() || el.children.length > 1) return;
          const text = el.textContent.trim();
          if (text.length > 60) return;
          items.push({ role: 'mega-menu-item', ...getProps(el) });
        });
      });

      // Mobile drawer
      const drawer = nav.querySelector('[data-mobile-drawer]');
      if (drawer && getComputedStyle(drawer).display !== 'none') {
        drawer.querySelectorAll('a, summary, div').forEach(el => {
          if (!el.textContent?.trim() || el.children.length > 2) return;
          items.push({ role: 'mobile-drawer-item', ...getProps(el) });
        });
      }
    }

    // Footer
    const footer = document.querySelector('footer');
    if (footer) {
      footer.querySelectorAll('span, a').forEach(el => {
        if (!el.textContent?.trim()) return;
        if (el.closest('img')) return;
        items.push({ role: 'footer-item', ...getProps(el) });
      });
    }

    return items;
  });

  return results;
}

(async () => {
  const browser = await chromium.launch();
  const allResults = {};

  for (const vw of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: 900 } });
    const page = await ctx.newPage();
    allResults[`${vw}px`] = await measurePage(page, vw);
    await ctx.close();
  }

  await browser.close();

  // Compute contrast ratios
  for (const [vp, items] of Object.entries(allResults)) {
    for (const item of items) {
      const fg = parseColor(item.color);
      const bg = parseColor(item.backgroundColor);
      const fgL = luminance(...fg);
      const bgL = luminance(...bg);
      const lighter = Math.max(fgL, bgL);
      const darker = Math.min(fgL, bgL);
      item.contrastRatio = Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
    }
  }

  // Save JSON
  mkdirSync(dirname(resolve(outJson)), { recursive: true });
  writeFileSync(resolve(outJson), JSON.stringify(allResults, null, 2));
  console.log(`Saved ${resolve(outJson)}`);

  // Generate markdown summary (1440px viewport)
  const primary = allResults['1440px'] || allResults[Object.keys(allResults)[0]];
  if (primary) {
    const seen = new Set();
    const rows = primary.filter(item => {
      const key = `${item.role}|${item.text}|${item.fontSize}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let md = `# Nav Metrics — Before\n\n`;
    md += `**Date:** ${new Date().toISOString().slice(0, 10)}\n`;
    md += `**Viewports:** ${viewports.join(', ')}px\n\n`;
    md += `| Role | Text | Font | Size | Weight | LH | Tracking | Transform | Color | Contrast | W×H |\n`;
    md += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
    for (const r of rows) {
      md += `| ${r.role} | ${r.text.slice(0, 30)} | ${r.fontFamily} | ${r.fontSize} | ${r.fontWeight} | ${r.lineHeight} | ${r.letterSpacing} | ${r.textTransform} | ${r.color} | ${r.contrastRatio}:1 | ${r.width}×${r.height} |\n`;
    }
    writeFileSync(resolve(outMd), md);
    console.log(`Saved ${resolve(outMd)}`);
  }
})();
