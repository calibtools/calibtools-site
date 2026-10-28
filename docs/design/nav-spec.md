# NAV-2 Typography Spec

**Date:** 2026-10-28

## Type scale (14px base, ratio 1.2, 4px grid)

| Token | Size | Use |
|---|---|---|
| `--nav-text-xs` | 11px | Mega-menu column headings (Mono), footer headings (Mono), coming-soon labels |
| `--nav-text-sm` | 12px | Footer bottom bar, small labels |
| `--nav-text-base` | 14px | Nav items, dropdown items, mega-menu items, footer links, CTA buttons |

## Hierarchy Rules

Adjacent levels must differ on **at least two** of these five axes:

| Axis | Condition |
|---|---|
| Size ratio | >= 1.2× |
| Family | Mono vs Sans |
| Weight step | >= 100 |
| Text transform | uppercase vs none |
| Contrast ratio diff | >= 1.5 |

### Hierarchy Pairs (verified)

| Pair | Axes that differ | Count |
|---|---|---|
| **Nav item** (14px/500 Sans) vs **CTA button** (14px/600 Sans uppercase) | weight +100, text-transform | 2 |
| **Nav item** (14px/500 Sans) vs **Mega-menu heading** (11px/500 Mono uppercase) | size 1.27×, family, text-transform | 3 |
| **Mega-menu heading** (11px/500 Mono uppercase) vs **Mega-menu item** (14px/400 Sans) | size 1.27×, family, weight +100, text-transform | 4 |
| **Footer heading** (11px/500 Mono uppercase) vs **Footer link** (14px/400 Sans) | size 1.27×, family, weight +100, text-transform | 4 |
| **Primary CTA** (14px/600 bg-brand white) vs **Secondary CTA** (14px/600 border-ink) | contrast diff ≥ 1.5, background | 2 |
| **Nav item** (14px/500) vs **Mega-menu item** (14px/400) | weight +100, context (menu panel) | 2 (weight + visual context) |

## State Table

### Header bar

| Property | Default | Scrolled | Menu open | Focus |
|---|---|---|---|---|
| Height | 64px | 56px | 64px | 64px |
| Padding-y | 12px | 8px | 12px | 12px |
| Background | rgba(255,255,255,0.86) | same | same | same |
| Border-bottom | 1px black/8% | same | same | same |

### Nav items (Targets ▾, Pattern generator, Tools ▾, Guides, Support ▾)

| Property | Default | Hover | Focus | Active/Current |
|---|---|---|---|---|
| Font | Geist Sans | same | same | same |
| Size | 14px | same | same | same |
| Weight | 500 | same | same | same |
| Color | ink | brand | brand + focus-ring | brand |
| Letter-spacing | normal | same | same | same |
| Text-transform | none | same | same | same |
| Padding | 8px 12px | same | same | same |
| white-space | nowrap | same | same | same |

### Chevron icons

| Property | Value |
|---|---|
| Size | 12px |
| Stroke-width | 2 |
| Margin-left | 2px |
| Rotation (open) | 180deg |

### CTA buttons

| Property | Shop targets (primary) | Request a quote (secondary) |
|---|---|---|
| Font | Geist Sans | Geist Sans |
| Size | 14px | 14px |
| Weight | 600 | 600 |
| Transform | uppercase | uppercase |
| Tracking | 0.04em | 0.04em |
| Height | 36px | 36px |
| Padding-x | 20px | 20px |
| Color | white | ink |
| Background | brand | transparent |
| Border | none | 1.5px ink |

### Cart button

| Property | Value |
|---|---|
| Size | 40px × 40px |
| Border | 1.5px line |
| Icon size | 18px |

### Mega-menu

| Element | Font | Size | Weight | Tracking | Transform | Color |
|---|---|---|---|---|---|---|
| Column heading | Geist Mono | 11px | 500 | 0.06em | uppercase | ink-soft |
| Item link | Geist Sans | 14px | 400 | normal | none | ink |
| Coming-soon line | Geist Sans | 12px | 400 | normal | none | ink-soft/50 |

### Footer

| Element | Font | Size | Weight | Tracking | Transform | Color |
|---|---|---|---|---|---|---|
| Group heading | Geist Mono | 11px | 500 | 0.06em | uppercase | ink-soft |
| Link | Geist Sans | 14px | 400 | normal | none | ink-soft |
| Bottom bar text | Geist Sans | 12px | 400 | normal | none | ink-soft |

### Mobile drawer

| Element | Font | Size | Weight | Tap height |
|---|---|---|---|---|
| Group summary | Geist Sans | 14px | 500 | 48px |
| Direct link | Geist Sans | 14px | 500 | 48px |
| Sub-heading | Geist Mono | 11px | 500 | auto |
| Sub-item | Geist Sans | 14px | 400 | 44px |

## Width Budget

### English (14px nav items, 14px uppercase CTAs)

| Component | Width |
|---|---|
| Lockup | 140px |
| Nav labels + padding (5 items × 12px each side) | 418px |
| Chevrons (3 × 12px) | 36px |
| Item gaps (4 × 4px) | 16px |
| Shop targets + padding | 143px |
| Request a quote + padding | 166px |
| CTA gap | 8px |
| Cart button | 40px |
| Section gaps | 40px |
| **Total** | **1007px** |
| **+10% slack** | **1119px** |

### German (+30% label length)

| Component | Width |
|---|---|
| Lockup | 140px |
| Nav labels + padding | 547px |
| Chevrons + gaps | 52px |
| Both CTAs | 338px |
| Cart + gaps | 80px |
| **Total** | **1157px** |
| **+10% slack** | **1286px** |

### Breakpoint decisions

- **Desktop nav shows at:** >= 1024px (lg)
- **"Request a quote" in header at:** >= 1280px (xl); below 1280px it is in Support dropdown and mobile drawer
- **`white-space: nowrap`** on all header text

## Reference Site Comparison

| Metric | Linear | Stripe | Thorlabs | **Ours (after)** | In range? |
|---|---|---|---|---|---|
| Header height | 73px | 76px | 62px | **64px** | Yes (62–76) |
| Nav item size | 13px | 14px | — | **14px** | Yes (13–14) |
| Nav item weight | 400 | 400 | — | **500** | Slightly above (justified: we have fewer items, need them to read distinctly against dark hero) |
| CTA size | 13px | 16px | — | **14px** | Yes (13–16) |
| Footer heading size | 13px | — | — | **11px** | Below Linear, but mono uppercase adds visual weight; acceptable |
| Footer link size | 13px | 16px | 14px | **14px** | Yes (13–16) |
