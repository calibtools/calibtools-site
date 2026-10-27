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

## GitHub Actions secrets

The **Review invites** workflow (`.github/workflows/review-invites.yml`) runs daily
and requires four repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Source | Purpose |
|---|---|---|
| `CF_ACCOUNT_ID` | Cloudflare dashboard → Account ID | Identifies the CF account |
| `CF_KV_REVIEWS_NAMESPACE_ID` | Workers & Pages → KV → REVIEWS namespace ID | KV namespace holding invite tokens |
| `CF_API_TOKEN` | Cloudflare API Tokens → Create Token (Account / Workers KV Storage / Edit) | Read/write invite records |
| `RESEND_API_KEY` | Resend dashboard → API Keys | Send invite emails from `reviews@calib.tools` |

## 404 page

`src/pages/404.astro` generates `dist/404.html`. Cloudflare Pages automatically
serves this file for any URL that does not match a route — no `_redirects` rule needed.
