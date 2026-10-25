# Calib.Tools customer documents — design system (read fully before building)

You are building ONE customer document type of Calib.Tools (German maker of camera calibration targets for machine
vision). All documents share one design system. Consistency with the reference implementation matters more than
originality.

## Files you must use (read-only — never edit anything in docs/design/customer-docs/_source/system/)

| Path | What |
|---|---|
| `docs/design/customer-docs/客户交付文件内容规范.md` | Content spec (Chinese). Section 1 = shared layout rules; your document has its own section. Follow it field by field, in order. |
| `docs/design/customer-docs/_source/system/ctdoc.py` | Page system + components (`Doc`, `section`, `p`, `kv`, `table`, `status`, `result_box`, `note`, `code`, `checkbox`, `num`, `qr_block`, `stamp_svg`, `signature`, `esc`). Read its source. |
| `docs/design/customer-docs/_source/system/ctpattern.py` | Exact vector boards (`board_svg`, real ArUco bits), `axes`, `corner_list`, `dim_h`, `dim_v`, `scale_bar`, `label_line_frag`. |
| `docs/design/customer-docs/_source/system/ctplot.py` | Brand-styled matplotlib → inline SVG (`figure`, `limit`, `svg`, `CMAP`). |
| `docs/design/customer-docs/_source/system/sample.json` | Shared sample data (product, unit 000311, inspection, order CT-1047 with lines, customers, OEM batch, quote). Use it — do not invent conflicting values. |
| `docs/design/customer-docs/_source/system/sample_coords.json` | 176 measured corners of SN 000311 (synthetic). |
| `docs/design/customer-docs/_source/build/build_ir.py` | **Reference implementation** (CT-IR, 2 pages). Copy its structure and look. |
| `docs/design/customer-docs/CT-IR/CT-IR-000311-p-1.png`, `-p-2.png` | Rendered reference pages. Look at them first. |
| `docs/brand/` | Brand assets (colours, type, logo rules) — see repo docs/brand/ directory. |

## Build pattern

```python
import sys, json
sys.path.insert(0, "docs/design/customer-docs/_source/system")
from ctdoc import *
import ctpattern as CP, ctplot as CPL
S = json.load(open("docs/design/customer-docs/_source/system/sample.json"))
d = Doc("CT-XX-....", "A", "2026-11-05", eyebrow="Delivery note", title="Order CT-1047", sn=None)
d.add_page(...html for page 1...)          # page 1 gets eyebrow + title automatically
d.add_page(...html for page 2...)
r = d.render("docs/design/customer-docs/<CODE>/<file-base>")   # writes .pdf (A4), -letter.pdf, -p-N.png previews
```
Put your script at `docs/design/customer-docs/_source/build/build_<code>.py` (lower-case code, e.g. `build_dn.py`).
Output only into `docs/design/customer-docs/<CODE>/` (your own folder).

## Non-negotiable rules (spec §1 + brand guidelines)

1. **Pages are fixed, not flowing.** You decide what goes on each page. `render()` must print `overflow=none` for
   both A4 and Letter. Letter is produced automatically (same layout scaled to 93.2 %, stamp/QR counter-scaled) —
   if A4 fits, Letter fits. Use `<div class="push">…</div>` as the last block to pin signature/QR blocks to the
   page bottom. Stay within the page count the spec gives for your document.
2. Header/footer/watermark come from `Doc` — never draw your own. Header right = `<number> · Rev X · <date>`.
   Footer left gets `calib.tools/verify/<SN>` only when the document is about one serial (`sn=`).
3. Every sample is watermarked `SAMPLE` (default). Never remove it.
4. Type: Geist Regular 10 pt body (Grey 80 #333), Geist Bold title 20–24 pt one line (h1 is 21 pt — keep the title
   short enough for one line on 178 mm), section headings via `section(n, title)`, tables 9.5 pt, all numbers in
   Geist Mono, right-aligned (`'n'` columns), units in the header `(mm)` or after the number. Use the true minus
   sign `−` (use `num()`), `×` for dimensions, `·` as separator, `–` for ranges (0–101), `°C` with a space before.
5. Colour: black, white, greys only (#333 / #666 / #B3B3B3 / #E6E6E6 / #F2F2F2). **Red #E60012 appears only in the
   wordmark (already in header) and as the X-axis arrow in board figures**; green #00A651 only for the Y-axis arrow.
   Never red for FAIL, warnings, highlights or charts. FAIL = bold Mono + crossed box via `status("FAIL")`.
6. Status words exactly: `PASS · FAIL · PENDING · N/A` via `status()` / `table(... 's' column)`.
7. Legal wording: never describe Calib.Tools or its own documents as *certified*, *verified* or *accredited*.
   Boards are *inspected/measured*, never *calibrated*. Only a third-party lab is "accredited".
8. Paragraphs ≤ 3 lines; prefer tables and key–value blocks (`kv`) over prose.
9. Placeholders for facts that are not decided yet (legal entity, address, VAT ID, inspection location, country of
   origin, lab name …) are written in square brackets exactly as in sample.json, e.g. `[Legal entity name — to be decided]`.
10. No emojis, no icons fonts, no other logos, no stock photos. Board images = `ctpattern.board_svg` (label them
    "Rendering" where the spec asks for a product image).
11. Characters missing from Geist: ✕ ✓ ☐ ☑ ■ □ — do not type them; use `status()`, `checkbox()`, or inline SVG.
    Uppercased labels (`.tag`, `th`) turn `µ` into Greek `Μ` — keep units inside parentheses in headers
    (the table helper protects `( … )`), or use class `nu`.
12. QR codes: `qr_block(url, 14–16)`; ≥ 12 mm. URLs: `https://calib.tools/verify/<SN>` (IR, CoC, CC, RI, BR) or
    `https://calib.tools/files/<doc-code>` (DS, UM, AN).
13. Inspection stamp (`signature(..., stamp=(sn, date, initials))`) only on IR, RI, BR, CoC.
14. True physical size (print sheets): wrap in `<div class="true-scale">` and size SVG in mm.

## Quality check before you finish

- `render()` says `overflow=none` (A4 and Letter).
- Look at every preview PNG (`-p-N.png`) yourself; fix crowding, orphan headings, awkward wraps, empty half pages
  (unless the spec content is short — then pin the closing block with `push`).
- `pdffonts <pdf>` shows only Geist / Geist Mono / GeistPixel fonts (no Liberation / DejaVu fallback).
- Spelling of fixed strings: `CALIB.TOOLS` wordmark (header only), part numbers, serials, doc numbers exactly as in sample.json.
