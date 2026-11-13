# calibtools-site

Marketing + tools site for calib.tools. Astro 5 (static) + Tailwind + React islands.
Shop (cart, checkout, tax) lives on Shopify at shop.calib.tools; this site renders
catalog pages from the Storefront API and links into the cart.

## What matters most
- Every pattern tool must be geometrically identical to what OpenCV expects.
  Geometry lives ONLY in `src/lib/patterns.ts` (to become `packages/core`). Never
  reimplement coordinates, IDs or dictionary bits inside a component or page.
- Printed output is 1:1 in millimeters. SVG/PDF use mm units with a 100 mm scale bar.
  Any change to `src/lib/patterns.ts` or PDF export needs a test and `/verify-pdf`.
- Tools run entirely in the browser. No upload of images or calibration files, ever.
- Design: read DESIGN.md (drawing-sheet system, VI v3) before changing any page, component or style.
  Paper ground, ink lines, red #E60012 for fills and red-text #B3000E for text, Geist Sans + Geist Mono, Geist Pixel
  for pixel values only. No dark pages, gradients, shadows or radii above 2 px. Use Tailwind tokens, not raw hex.

## Workflow
- New feature: plan first (list files + tests), then implement tests before code.
- `pnpm test` (vitest) and `pnpm check` (astro check) must pass before a merge; CI runs both on every PR.
  Locally, run what the change can break: content, copy or images only → the related test file and
  `node scripts/check-prose.mjs`; components, pages or styles → related tests and `pnpm check`;
  a row of cards (new or changed) → build, then `node scripts/check-card-rows.mjs` (DESIGN.md §3 Card rows);
  `src/lib/**`, exports, PDF or docs build → the full suite, a build and `npx tsx scripts/check-exports.mjs`.
- Batch: changes on one theme within half a day go in one PR, one commit per change. Geometry, export
  and download fixes ship on their own.
- Ship with `node scripts/ship.mjs --title … --body <file> --check "/path/::expected text"`: it pushes,
  opens the PR, waits for both checks, squash-merges, waits for the deploy and checks the live pages.
  It never merges on a failed check.
- Keep command output short (`head`, `cut -c`, `--jq`). Start from a fresh `origin/main`.
- Keep pages static; use `client:load` islands only for interactive tools.
- No new runtime dependency without a one-line reason in the PR. Never jsPDF; use pdf-lib.
- No analytics or tracking scripts. No cookies beyond what Shopify needs on its own domain.
  Exception — customer accounts (saved patterns, quote history): sign-in through Shopify customer
  accounts; after sign-in only, one first-party HttpOnly session cookie on calib.tools. Saved patterns
  are stored on the customer's Shopify record. No tracking, no third parties; list it on /privacy/.

## Conventions
- No personal names anywhere: not on the site, in copy, metadata, structured data, PDFs, review replies or docs. Sign as "Calib.Tools" or "Calib.Tools Engineering"; use role mailboxes (hello@, support@ …), never a personal address.
  Exception — customer quotations (CT-QT, `/q/…` offer PDFs and their offer data): the signatory is "Kevin Lee", Customer Success, the name customer inquiries are answered under. No other personal name, and not on any other document or page.
- Brand in prose = Calib.Tools; domain/URLs/logo stay lowercase calib.tools.
- Logo: header and footer use only the framed wordmark, no ™ (`public/brand/wordmark-framed-light.svg` positive, `-dark.svg` negative; red dot, never mono). The C.T icon is the favicon only. See docs/brand/brand.md.
- Spelling: US English (millimeters, aluminum, color, center, optimize, catalog). Code identifiers, API fields, URL slugs and quoted third-party text are left as they are.
- Tool metadata lives in `src/lib/tools.ts` (single source of truth for live/coming-soon status).
- Units: mm internally; px only for screen rendering.
- Coordinates: OpenCV (origin top-left, x right, y down). Corner order = cv.findChessboardCorners.
- ChArUco IDs follow cv.aruco.CharucoBoard (row-major over white squares).
- Dictionaries come from data files (to be added under src/lib/dicts/), never hand-typed.
- Copy is literal in markup; prices and tolerances are placeholders until confirmed by supplier.

## Commands
pnpm install · pnpm dev · pnpm build · pnpm test · pnpm check

## Roadmap (from docs/plan.md)
All T1–T7 tools are live. See docs/plan.md for acceptance criteria.
Customer PDFs are generated from src/docs/ (port of docs/design/customer-docs/_source); do not edit the Python reference.
