# calibtools-site

Marketing + tools site for calib.tools. Astro 5 (static) + Tailwind + React islands.
Shop (cart, checkout, tax) lives on Shopify at shop.calib.tools; this site renders
catalogue pages from the Storefront API and links into the cart.

## What matters most
- Every pattern tool must be geometrically identical to what OpenCV expects.
  Geometry lives ONLY in `src/lib/patterns.ts` (to become `packages/core`). Never
  reimplement coordinates, IDs or dictionary bits inside a component or page.
- Printed output is 1:1 in millimetres. SVG/PDF use mm units with a 100 mm scale bar.
  Any change to `src/lib/patterns.ts` or PDF export needs a test and `/verify-pdf`.
- Tools run entirely in the browser. No upload of images or calibration files, ever.
- Design direction A (see docs/design.md): red #E60012 / dark red #B3000E on white,
  Inter + JetBrains Mono. Use Tailwind tokens from tailwind.config.mjs, not raw hex.

## Workflow
- New feature: plan first (list files + tests), then implement tests before code.
- `pnpm test` (vitest) and `pnpm check` (astro check) must pass before a PR.
- Keep pages static; use `client:load` islands only for interactive tools.
- No new runtime dependency without a one-line reason in the PR. Never jsPDF; use pdf-lib.
- No analytics or tracking scripts. No cookies beyond what Shopify needs on its own domain.

## Conventions
- Units: mm internally; px only for screen rendering.
- Coordinates: OpenCV (origin top-left, x right, y down). Corner order = cv.findChessboardCorners.
- ChArUco IDs follow cv.aruco.CharucoBoard (row-major over white squares).
- Dictionaries come from data files (to be added under src/lib/dicts/), never hand-typed.
- Copy is literal in markup; prices and tolerances are placeholders until confirmed by supplier.

## Commands
pnpm install · pnpm dev · pnpm build · pnpm test · pnpm check

## Roadmap (from docs/plan.md)
T1 generator (PDF, DXF, PNG, Kalibr/ROS/HALCON exports) → T3 FOV calculator → T2 wizard →
T4 converter → T5 detection check (OpenCV.js) → T6 quality analyzer → T7 capture assistant.
