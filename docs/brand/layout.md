# Layout

## Breakpoints

| Token  | px   | Tailwind | Use                         |
|--------|------|----------|-----------------------------|
| sm     | 640  | sm:      | Two-column cards            |
| md     | 768  | md:      | Desktop nav, hide mobile UI |
| lg     | 1024 | lg:      | Three-column cards          |
| xl     | 1280 | xl:      | Four-column cards, max-w    |

## Grid

`.container-x` = `max-w-[1280px]` + `px-5 md:px-16` (20 / 64 px side padding).

Card grids: 1 col < 640, 2 cols from 640, 3 from 1024, 4 from 1280 where cards are <= 300 px.
Gaps: 16 px < 768, 24 px from 768, 32 px from 1280.

## Spacing scale (4 px base)

| Token        | Value |
|-------------|-------|
| --space-1   | 4 px  |
| --space-2   | 8 px  |
| --space-3   | 12 px |
| --space-4   | 16 px |
| --space-6   | 24 px |
| --space-8   | 32 px |
| --space-12  | 48 px |
| --space-16  | 64 px |

## Section rhythm

`--section-y` sets vertical padding on every top-level section:

| Width       | Value |
|-------------|-------|
| < 768 px    | 48 px |
| >= 768 px   | 64 px |
| >= 1280 px  | 80 px |

Use `py-[var(--section-y)]` on every section. Two documented exceptions:

1. **Homepage hero**: `py-10 md:flex lg:py-14` — tighter top to keep the fold visible.
2. **First section under a page header** (e.g. product buy-box): `py-8 md:pb-16` — the breadcrumb already adds top space.

## Tap-target rule

Every interactive element (link, button, input, summary, menu item) >= 24 x 24 px at all widths.

Below 768 px, standalone links (footer, breadcrumb, menu items, accordion summaries) >= 44 px tall.
Achieved with `min-h-[44px] md:min-h-0 flex items-center` — padding, not larger text.

Inline links inside paragraphs are exempt.
Checkboxes and radios: visual size unchanged, but the label row is the hit area and >= 44 px tall below 768.

## Fixed-element rule

When the mobile bottom cluster is visible, `<main>` has `pb-[calc(88px+env(safe-area-inset-bottom,0px))]`.

On product pages the floating "Add to cart" pill appears only after the in-page buy-box scrolls out of view, and hides again when it scrolls back in (IntersectionObserver on `[data-buy-box]`).

No fixed element may cover the title, price, options or add-ons in their resting position.
