# calib.tools — site

Astro + Tailwind site with browser-side calibration tools. Shop runs on Shopify (shop.calib.tools).

```bash
pnpm install
cp .env.example .env   # add Storefront token when ready
pnpm dev               # http://localhost:4321
pnpm test && pnpm check && pnpm build
```

Structure
- `src/pages` — home, /tools/*, /targets/*, /guides/*
- `src/islands` — React islands (Generator)
- `src/lib/patterns.ts` — pattern geometry (seed of packages/core)
- `src/lib/shopify.ts` — Storefront API client with static fallback
- `src/content/guides` — markdown guides
- `CLAUDE.md`, `.claude/rules`, `.claude/skills` — conventions for Claude Code
- `docs/design.md`, `docs/plan.md` — design tokens and tool roadmap

Deploy: Cloudflare Pages, build command `pnpm build`, output `dist`.
