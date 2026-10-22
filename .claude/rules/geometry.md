---
paths: ["src/lib/patterns*.ts", "packages/core/**"]
---
- Every exported function has JSDoc with the formula and the OpenCV function it must match.
- Floating-point comparisons in tests use a 1e-9 tolerance.
- Adding a pattern type: update `PatternSpec`, geometry, SVG, a golden test, and docs/patterns.md.
- Never derive marker bits procedurally in production code; load from `src/lib/dicts/*.json`.
