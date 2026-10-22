# Tool roadmap

See the project plan document "calib.tools 工具平台 Claude Code 开发计划" for full specs and acceptance criteria.

| Tool | Status | Acceptance |
|---|---|---|
| T1 Pattern generator | v0 (SVG + opencv.json) | PDF 1:1 within 0.2 mm; OpenCV detects theoretical corner count; golden tests |
| T3 FOV calculator | todo | ±1% vs reference calculators |
| T2 Selection wizard | todo | 20 scenarios reviewed |
| T4 Format converter | todo | round-trip error < 1e-9 |
| T5 Detection check | todo | matches OpenCV Python on 50 samples |
| T6 Quality analyzer | todo | stats match Calibrator on same dataset; < 60 s for 50 × 12 MP |
| T7 Capture assistant | todo | ≥ 10 fps on phone; 15 guided shots → < 0.3 px |
