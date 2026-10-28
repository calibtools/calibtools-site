#!/usr/bin/env node
/**
 * Take a 1440-wide screenshot of a product page with an injected
 * imported free-sample review fixture. Output: docs/reviews/review-fixture-1440.png
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '..', 'dist');
const OUT = resolve(__dirname, '..', 'docs', 'reviews', 'review-fixture-1440.png');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp',
};

function serve(port) {
  return new Promise((res) => {
    const server = createServer((req, resp) => {
      let url = req.url.split('?')[0];
      if (url.endsWith('/')) url += 'index.html';
      const file = join(DIST, url);
      if (!existsSync(file)) { resp.writeHead(404); resp.end(); return; }
      const ext = extname(file);
      resp.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      resp.end(readFileSync(file));
    });
    server.listen(port, () => res(server));
  });
}

async function main() {
  const server = await serve(4399);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:4399/targets/charuco-composite/', { waitUntil: 'networkidle' });

  // Inject a fixture review card into the reviews section
  await page.evaluate(() => {
    const section = document.querySelector('#reviews');
    if (!section) return;

    // Clear "no reviews yet" empty state
    const empty = section.querySelector('.text-center');
    if (empty) empty.remove();

    // Find the review list container (right column)
    const rightCol = section.querySelector('.flex.min-w-0.flex-1.flex-col.gap-4');
    if (!rightCol) return;

    // Update the count text
    const countEl = rightCol.querySelector('.text-sm.text-ink-muted');
    if (countEl) countEl.textContent = '1 review';

    // Inject a review card
    const card = document.createElement('article');
    card.className = 'flex flex-col gap-2.5 rounded border border-line bg-ground-alt p-5';
    card.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex gap-0.5">
          ${'★'.repeat(5).split('').map(() => '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-brand"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>').join('')}
        </div>
        <span class="font-mono text-xs text-ink-muted">15 Sep 2026</span>
      </div>
      <h4 class="m-0 text-[16px] font-semibold">Excellent flatness for multi-camera rigs</h4>
      <p class="m-0 text-[15px] leading-relaxed text-ink-muted">Used this board for a six-camera automotive rig. Corner detection was consistent across all views. The aluminium composite substrate is rigid enough that we no longer need to clamp the board to a flat surface.</p>
      <div class="flex flex-wrap items-center gap-2 pt-1 text-xs text-ink-muted">
        <span class="font-semibold text-ink">Alex Chen</span>
        <span>· Perception Lab, Acme Robotics</span>
        <span>· Received a free sample</span>
      </div>
    `;
    rightCol.appendChild(card);

    // Update the summary
    const summary = section.querySelector('.font-mono.text-\\[40px\\]');
    if (summary) summary.textContent = '5.0';
    const summaryText = section.querySelector('.text-sm.text-ink-muted');
    if (summaryText && summaryText.closest('.md\\:w-\\[300px\\]')) {
      summaryText.textContent = '1 review';
    }
  });

  await page.waitForTimeout(500);

  // Scroll to reviews section
  await page.evaluate(() => {
    document.querySelector('#reviews')?.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(300);

  if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, fullPage: false });
  console.log(`Screenshot saved to ${OUT}`);

  await browser.close();
  server.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
