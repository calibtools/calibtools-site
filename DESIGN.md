# DESIGN.md — Calib.Tools (VI v3, adopted 2026-11-11)

Read this before changing any page, component or style. It describes how calib.tools looks and why.
The reasoning behind it lives in the internal brand document (VI v3, drawing-sheet system).

## 1. Concept: the drawing sheet

Every target starts as a file and becomes an object. The site looks like a clean engineering drawing:
paper-colored ground, ink lines, a title block, real dimensions, a coordinate origin.
Two worlds appear on the page and each has its own type:

- **Pixels** (camera side): Geist Pixel Square — pixel values, marker IDs, detection results.
- **Millimeters** (physical side): Geist Mono — sizes, tolerances, part numbers, specs, UI labels.
- Body copy and headings: Geist Sans.

`1 px = 0.21 mm` keeps both fonts on one line. That rule is part of the brand.

## 2. Tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `paper` | #F4F3EF | page ground |
| `paper-alt` | #EAE8E2 | section ground, table stripes |
| `sheet` | #FFFFFF | spec tables, product images, cards |
| `ink` | #141414 | text, line drawings |
| `ink-muted` | #4A4A47 | secondary text (any ground) |
| `ink-soft` | #6B6A66 | notes and labels — on `paper` or `sheet` only |
| `hairline` | #D6D3CB | 1 px rules |
| `line-strong` | #A8A59C | input borders, bracket corners |
| `red` | #E60012 | primary button fill, origin dot, X axis, text ≥ 24 px, detected corners |
| `red-text` | #B3000E | all normal-size red text, links, table header text |
| `red-tint` | #FBE9EA | table header background |
| `green-y` | #00A651 | Y axis arrow and detection overlays only, on `sheet` (white) |
| `green-text` | #007A3D | green text such as PASS |

In code the tokens are CSS variables in `src/styles/global.css`, exposed through Tailwind (`tailwind.config.mjs`):
`paper` = `bg-ground`, `paper-alt` = `bg-ground-alt` / `bg-ground-panel`, `sheet` = `bg-sheet`, `hairline` = `border-line`,
`line-strong` = `border-line-strong`, `red` = `bg-brand`, `red-text` = `text-brand-dark` (and `text-brand-text`),
`red-tint` = `bg-brand-tint`, `green-y` = `axis-y`, `green-text` = `text-ok`. Use the Tailwind tokens, never raw hex.

Measured WCAG contrast on `paper`: ink 16.6, ink-muted 8.0, ink-soft 4.9, red-text 6.5, **red 4.3 (fails for body text)**,
**green-y 2.9 (fails, graphics on white only)**. White on red 4.8.

Rules: red covers ≤ 3 % of a viewport. No gradients. No shadows. No backdrop blur. No dark theme for marketing pages.

### Type

| Family | Weights | Use |
|---|---|---|
| Geist Sans | 400, 500, 600 | body 400 · UI text and tables 500 · headings 600, tracking −1 % |
| Geist Mono | 400, 500, 600 | values 400 · labels 500 · buttons, part numbers, prices 600 |
| Geist Pixel Square | 400 | pixel values, IDs, detection results only |

Scale (px): 12, 13, 14, 16, 18, 22, 28, 40, 56. Body 16. Tables 14. Labels 12 Mono uppercase, tracking +4 %.
Never use weight 700–800 (Tailwind's `font-bold` and `font-extrabold` are mapped to 600 so old markup cannot bring them back). Table head differs from body in weight and background. `ink-soft` is for meta only (≤ 20 % of characters, never table values).
Each major section starts with: a plain-word label (Mono 12) + 40 × 3 red rule + heading.

### Shape and space

- Radius: 0 for cards, images, tables; 2 px for buttons and inputs (`rounded` = 2 px; `rounded-lg` and `rounded-xl` = 0). `rounded-full` only for real circles (dots, spinners).
- Grid: 12 columns, max content 1200 px, gutter 24 px. Sections separated by a 1 px `hairline` rule.
- No section numbers or internal codes on pages (`00 /`, `01 / TOOLS`, `T1`): owner decision 2026-11-11, visitors do not know what they mean.
- Dense where data is (spec tables), loose where reading is (guides). Left-aligned by default.

## 3. Components

| Component | Spec |
|---|---|
| Primary button | h 40, px 16, `red` fill, white Mono 13/500 uppercase, radius 2 |
| Secondary button | h 40, 1 px `ink` border, ink text, otherwise as primary |
| Link | `red-text`, 1 px underline, offset 3 px |
| Card | `.card`: `sheet` fill, 1 px `hairline` border, padding 20. Add `.bracket` for four bracket corners (L-shaped, 1.5 px `ink`, about 6–8 % of the short side; set `--bracket` to change the length). No radius, no shadow |
| Part-number box | h 48, `sheet` fill, 1 px `line-strong` border, radius 2, Mono 14; goes to the product page of a stock part number (`src/lib/partNumberLookup.ts`) |
| Badge | square 1 px border, Mono 11 uppercase. No pills |
| Spec strip | 3–4 cells: label (Mono 12 `ink-soft` uppercase), value (Mono 16 `ink`), condition (Sans 13 `ink-muted`) |
| Spec table | header `red-tint` bg + `red-text` text (never white on red), row height 40, stripes `paper-alt`, numeric columns Mono right-aligned |
| Dimension line | 1 px ink line, 45° ticks at both ends, value in Mono 12 with a `paper`/`sheet` knockout |
| Title block | PDFs, drawings and packaging labels only (issuer · document number · rev · date · scale). Not on web pages: page codes and build revisions mean nothing to a visitor (§7a) |
| Origin + axes | red dot at the origin, red X arrow right, green Y arrow down, as printed on the boards. At most once per page |

### Card rows (side-by-side blocks)

Blocks that sit side by side are read across as well as down, so the same line of content sits at the same height in every block of a row: label with label, title with title, copy with copy, price or action with price or action. This holds for any content, not only for today's copy: a title that wraps to three lines, or a line that one block does not have, must not push the lines below it out of step.

It applies to every row of alike blocks: category tiles, tool cards, spec cells, result cells, footer columns, form fields that share a line.

- One way to build it: the parent is a grid, and every block carries `rows-N` (`src/styles/global.css`), N = its content lines (image, label, title, copy, price). The block then takes the grid's rows instead of stacking its own. Set the gap between lines with `gap-y-*` on the block. With a breakpoint: `md:rows-5`.
- A wrapper inside a block that groups lines for the phone layout becomes `contents` at the width where the blocks stand side by side.
- Do not build such a block with `flex flex-col`, and do not line it up with `mt-auto`: that pins only the last line and leaves every line above it to float. It can look right with today's copy and break with the next product.
- Every block in a row has the same lines in the same order. A line with nothing to show stays in the markup, empty, and keeps its row.
- The price or action line sits on the bottom edge (`self-end`). A block that ends in a paragraph or a list may end where its text ends.
- A part that can appear later inside a line (a form error under an input) goes in a wrapper with that line, so the row count does not change.
- Form fields that share a line follow the same rule: caption, control and hint are lines. A field without a hint keeps an empty hint line when the field beside it has one.
- Blocks stacked one per line (phones) are free of this rule.

- Two page columns with different jobs (a tool's work area beside its side panel) are a layout, not a row of blocks. Mark the container `data-rows="layout"` and say why in the PR; the check skips it.

Checked by `node scripts/check-card-rows.mjs` after a build: every page, six widths (1920, 1280, 1024, 768, 640, 390) and once with web fonts blocked; with the copy as built, and again with one block's text made long (the longest title and description in the store) and then empty. It reports lines that start more than 1 px apart, blocks in one row with a different number of lines, and a price or action line off the bottom edge. It fails CI in Chromium; Firefox and WebKit run the same check and report.

What the check does not see, so review still has to: blocks with different tags or mostly different classes, table rows (cells are centered by default), content behind a closed `details`, a menu or the cart drawer, results that appear only after an upload, and the dark theme of the tools.

Icons: only where they speed up recognition (download, file type, tolerance class). Tolerance icons use GD&T symbols (⏥ flatness, ⌖ position, ⊥ perpendicularity). No decorative icon next to every heading.

## 4. Images

Site pictures are AI-generated until real photos exist (decided 2026-11-11), including inspection and unboxing scenes.
What makes a picture usable is that it matches the text beside it exactly: the right product, pattern, material and setting.
Line drawings generated from geometry and detection overlays (OpenCV corners and IDs) are used where the exact geometry matters.

- Line drawings come from `src/lib/boardDrawing.ts`, which uses the shared pattern renderers. Never hand-draw a pattern or a dimension.
  Each dimension line carries `data-mm`; `boardDrawing.test.ts` compares it with `boardSizes.ts` and with the drawn length (≤ 0.01 mm).
- On tiles and cards the product fills the frame: in at least one direction it covers three quarters of the picture. A tile is 84 px wide on a phone, so a product that floats in empty ground cannot be read. Crop the picture; do not shrink the product. Held by `tests/unit/category-image-fill.test.ts` for the category tiles.
- **Banned**: images that do not match the text or the product, the AI look (floating boards, glossy reflections, black voids), stock photos.

## 5. Motion

Only where it shows a real process: pattern generator redraw (lines drawn row by row, ≤ 200 ms), numeric ticker on calculator results,
live diagram while dragging working distance, paper-out animation on PDF export. Respect `prefers-reduced-motion`.
No parallax, fade-in headings, hover zoom on cards, floating blobs.

## 6. Copy rules that affect the look

- No "X. Y." paired slogans, no triplets, at most one dash per paragraph.
- Say the number: "300 × 200 mm, flat to 0.5 mm per meter" instead of an adjective.
- Banned words: precision (as an adjective on its own), premium, cutting-edge, seamless, robust, certified, verified, in stock.
- Every accuracy number has its condition (20 °C, three-point support) or is labeled as a target value.

## 7. Page structure

Home is utility-first: one-line statement, part-number input, pattern shortcuts and category tiles above the fold. No marketing hero image. The generated line drawing appears in section 03 and as the product-page main image until real photos exist.
A Figma reference exists for the home and product pages (pages 01 Home, 02 Product page, 90 Components, 91 Foundations); ask the owner for access.

## 7a. Nothing a visitor has to decode

Owner rule (2026-11-11): if a first-time visitor could ask "what is this for?", it does not go on the page.
That covers section numbers, internal codes, abbreviations we invented, and decoration borrowed from drawings that
carries no information for the reader. A label says in plain words what the section is. Part numbers, units and
standard names (OpenCV, DICT_5X5_100) are fine: the reader uses them.

## 8. Pre-merge checklist (AI-feel)

A page fails if any of these is true:
1. It has an image that does not match its text, has the AI look (floating board, reflections, black void), or has no sense of scale.
2. It uses the dark template skeleton (black ground, red mono eyebrow, 800-weight headline, solid + ghost buttons).
3. It has rounded shadowed cards with a line icon and "Learn more →".
4. A heading is a paired slogan or a triplet.
5. It has a row of identical icon-feature boxes.
6. It shows placeholders (grey boxes, [BRACKET TEXT]).
7. A paragraph has more than one dash.
8. Every section has the same centered layout and spacing.
9. A number has no source or condition.
10. It uses a banned adjective.
11. Icons decorate headings.
12. It uses a gradient, glow or blur.
13. Motion that does not show a real process.
14. Home or category pages with no human or working context (once photos exist).
15. Blocks in one row whose labels, titles, copy or prices start at different heights, or would with a longer title or an empty line (§3 Card rows).

## 8a. Which check holds which rule

A rule with no check is held by review only; it is listed so that nobody assumes otherwise.

| Rule | Held by | Blocks a merge |
|---|---|---|
| §2 Contrast of text tokens on their grounds | `tests/unit/contrast-tokens.test.ts`, `contrast-guard.test.ts`; Lighthouse color-contrast | yes |
| §2 No gradients, shadows, backdrop blur, dark pages | `tests/unit/style-guard.test.ts` | yes |
| §2 Pixel values in Geist Pixel, never for headings or labels | `tests/unit/style-guard.test.ts` | yes |
| §2 Tokens instead of raw hex; red ≤ 3 % of a viewport; type scale; weights | review | no |
| §3 Card rows (side-by-side blocks) | `scripts/check-card-rows.mjs` | yes in Chromium; reported in Firefox and WebKit |
| §3 Button, badge, table and other component specs | `scripts/measure-buttons.mjs`, `measure-nav.mjs` (run by hand); review | no |
| §4 Drawings match board sizes | `src/lib/boardDrawing.test.ts` | yes |
| §4 Images match their text; no AI look, no stock photos | review | no |
| §5 Motion | review | no |
| §6 Banned words and phrases, paragraph length | `scripts/check-prose.mjs`, `tests/claims-blacklist.test.ts` | yes |
| §6 Paired slogans, triplets, one dash per paragraph | review | no |
| §7a Nothing a visitor has to decode | review | no |
| §8 No placeholders | `scripts/check-placeholders.mjs` | yes |
| §9 No personal names | `tests/claims-blacklist.test.ts` (list in the `BLOCKED_NAMES` secret) | yes |
| Whole-page look against a baseline (four pages, 1440 and 390 px) | `tests/visual/pages.spec.ts` | no, reported |
| Accessibility ≥ 95 | `scripts/lighthouse-check.mjs` | yes |

## 9. Not to change

Logo files (brand kit v1.0: C.T ring, bracket wordmark, red square), brand reds, Geist family, 40 px buttons,
board axis colors. No personal names anywhere. Prices and tolerances only from `src/lib/claims.ts` and product data.
