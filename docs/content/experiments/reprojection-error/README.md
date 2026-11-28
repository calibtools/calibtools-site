# What does reprojection error tell you?

Scripts and saved results behind `src/content/guides/reprojection-error.md`.
`src/lib/reprojectionErrorGuide.test.ts` recomputes every number in the guide from `results/sessions.json` and checks
that the script printed in the guide, and its output, are the files here.

| File | What it does | Result file |
|---|---|---|
| `lab.py` | A ChArUco board (10 × 7 squares of 25 mm) rendered through a known camera: 1920 × 1440 px, focal length 2250 px, k1 = −0.20, k2 = 0.08. Options for a bowed board and a sheared view. The error of a solved camera model against the true one, the error per view, held-out views, rings by distance from the center, and a computed straight-edge check. | |
| `run.py` | 14 cases of 20 sessions: image quality, coverage, tilt, number of views, a bowed or stretched board, a wrong square size, one sheared view. Each session is solved with the default, a one-term and the twelve-term distortion model, with 8 more views held out. | `results/sessions.json` |
| `summary.py` | Prints the medians the guide quotes. | `results/summary.txt` |
| `check.py` | The script printed in the guide: error per view and error by ring. | `results/check.txt` |
| `end_to_end.py` | Renders 20 views with one sheared by 5 px, runs `check.py` on them and compares the calibration with and without that view against the true camera. | `results/end_to_end.json` |

Made with opencv-python-headless 5.1.0.95, numpy 2 and scipy. Run from this folder:

    python run.py 0 2 & python run.py 1 2 ; wait ; python run.py merge
    python summary.py > results/summary.txt
    python end_to_end.py

All of it is simulation. No camera was used. The straight-edge check is computed from points on a line, not from a
photo of an edge.
