---
paths: ["src/pages/**", "src/components/**", "src/islands/**"]
---
- Every tool page: input validation, shareable URL (state in query string), a "download all" action,
  and exactly one product link at the bottom. No popups, no email capture inside tools.
- Real `<button>`, `<a href>`, `<input>` + `<label>`; no click handlers on divs.
- Text contrast ≥ 4.5:1. Touch targets ≥ 44 px. Pages must work at 390 px width.
- Use Tailwind tokens (brand, ink, line, ground); raw hex only inside tailwind.config.mjs.
