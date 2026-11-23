# Board motion during calibration

Scripts and saved results behind `src/content/guides/how-still-calibration-board.md`.
`src/lib/boardMotionGuide.test.ts` checks every number in the guide against the files in `results/`.

| File | What it does | Result file |
|---|---|---|
| `board_motion.py` | The script printed in the guide. Corner positions only, numpy and opencv-python. | `results/board_motion.txt` |
| `board_motion_sweep.py` | The same test over 200 seeds and six amounts of motion. | `results/board_motion_sweep.txt` |
| `lab.py` | Image-level harness: renders the sessions, detects, solves, compares with the true camera. | |
| `table.py` | The eleven rows of the guide's table, 20 sessions each. | `results/table.json` |
| `harder_cases.py` | Every image moving, motion along the optical axis, plain checkerboard. | `results/harder_cases.json`, `results/larger_board.json` |
| `bands.py` | Readout rendered in 12, 48, 240 and 960 bands. | `results/bands.json` |

`lab.py` and the scripts that import it need the Plumbline core package
(`github.com/calibtools/plumbline`, the results were made at commit `5b3d197`) plus numpy, scipy and
opencv-python-headless 5.1.0. Run them from this folder. `table.py` takes about 20 minutes; it accepts
a list of case numbers so it can be run in parts.

All of it is simulation. No real camera images are in this folder.
