# Guide template

Copy this skeleton into `src/content/guides/<slug>.md` and fill in.

```markdown
---
title: ""
description: ""
date: YYYY-MM-DD          # first published
updated: YYYY-MM-DD       # last substantive edit
readingTime: "N min"
authorName: "Calib.Tools Engineering"
authorRole: "Calibration targets & tools"
related: []               # other guide slugs
keyRule: ""               # ≤ 160 chars, the one actionable rule
products: []              # product handles for related-products cards
sampleFiles: ["report"]   # report | datasheet | csv
faq:
  - q: ""
    a: ""
  - q: ""
    a: ""
  - q: ""
    a: ""
---

## First section heading

Body paragraphs go here. Keep each paragraph ≤ 3 lines (~360 chars).

## Second section heading

...
```

## Checklist

Before submitting a guide PR, verify every item:

- [ ] `keyRule` contains one rule with a number (e.g. "35 markers per board")
- [ ] At least one real example — code, a table, or a worked calculation
- [ ] FAQ questions are phrased as search queries people type (e.g. "How many markers does a ChArUco board have?")
- [ ] At least one product handle in `products`
- [ ] No banned phrases (run `node scripts/check-prose.mjs`)
- [ ] Every paragraph ≤ 3 lines (~360 characters)
- [ ] `updated` date is today
