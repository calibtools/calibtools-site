/**
 * Playwright script: measure every <a class*="btn"> / <button> on target pages.
 * Outputs a markdown report grouped by distinct (height, fontSize, textTransform) combos.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4321';
const PAGES = ['/', '/targets/', '/tools/', '/targets/charuco-composite/', '/faq/'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

async function measurePage(page, url, vpName) {
  await page.goto(url, { waitUntil: 'networkidle' });
  return page.evaluate((vpName) => {
    const sels = document.querySelectorAll('a[class*="btn"], button');
    const results = [];
    for (const el of sels) {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      // Skip invisible/off-screen elements
      if (rect.width === 0 || rect.height === 0) continue;
      results.push({
        tag: el.tagName.toLowerCase(),
        text: el.textContent.trim().slice(0, 50),
        classes: el.className.split(/\s+/).filter(c => c.includes('btn') || c.includes('primary') || c.includes('outline') || c.includes('dark') || c.includes('ghost')).join(' ') || el.className.slice(0, 60),
        height: Math.round(rect.height),
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        letterSpacing: cs.letterSpacing,
        textTransform: cs.textTransform,
        borderRadius: cs.borderRadius,
        bgColor: cs.backgroundColor,
        color: cs.color,
        viewport: vpName,
      });
    }
    return results;
  }, vpName);
}

const browser = await chromium.launch();
const allButtons = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  for (const path of PAGES) {
    const buttons = await measurePage(page, BASE + path, vp.name);
    for (const b of buttons) {
      b.page = path;
    }
    allButtons.push(...buttons);
  }
  await ctx.close();
}
await browser.close();

// Group by (height, fontSize, textTransform)
const combos = new Map();
for (const b of allButtons) {
  const key = `${b.height}px | ${b.fontSize} | ${b.textTransform}`;
  if (!combos.has(key)) combos.set(key, []);
  combos.get(key).push(b);
}

let md = `# Button audit — before\n\n`;
md += `**${combos.size} distinct (height, font-size, text-transform) combinations**\n\n`;
md += `**${allButtons.length} total buttons measured** across ${PAGES.length} pages × ${VIEWPORTS.length} viewports\n\n`;

const sorted = [...combos.entries()].sort((a, b) => {
  const ha = parseInt(a[0]);
  const hb = parseInt(b[0]);
  return ha - hb;
});

for (const [key, buttons] of sorted) {
  md += `## ${key}  (${buttons.length} instances)\n\n`;
  md += `| Page | VP | Tag | Text | Pad | Weight | Letter-sp | Radius | BG | Color |\n`;
  md += `|------|-----|-----|------|-----|--------|-----------|--------|----|-------|\n`;
  for (const b of buttons.slice(0, 10)) {
    md += `| ${b.page} | ${b.viewport} | ${b.tag} | ${b.text.slice(0, 25)} | ${b.paddingTop}/${b.paddingBottom} ${b.paddingLeft}/${b.paddingRight} | ${b.fontWeight} | ${b.letterSpacing} | ${b.borderRadius} | ${b.bgColor.slice(0, 25)} | ${b.color.slice(0, 25)} |\n`;
  }
  if (buttons.length > 10) md += `| ... | | | +${buttons.length - 10} more | | | | | | |\n`;
  md += `\n`;
}

process.stdout.write(md);
