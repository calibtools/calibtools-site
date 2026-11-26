# Composite, ceramic or glass?

Scripts and saved results behind `src/content/guides/composite-ceramic-or-glass.md`.
`src/lib/substrateGuide.test.ts` recomputes every number in the guide from the files in `results/` and checks
that the runs used the published limits and the board sizes from the shop.

| File | What it does | Result file |
|---|---|---|
| `solve_for_the_board.py` | The script printed in the guide: a bowed board with `calibrateCamera` and with `calibrateCameraRO`. numpy and opencv-python only. | `results/solve_for_the_board.txt` |
| `lab.py` | The camera, the four boards, the ways a board is deformed, the views, and the comparison of a fitted camera model with the true one. | |
| `run.py` | 69 rows of 20 sessions: each board exact and at its limits, fractions of the limit, the release-object method, fewer views, temperature. About 25 minutes. | `results/substrate.json` |

    python run.py                          # every row
    python run.py composite-300/bow/limit  # these rows only; the rest of the saved file is kept

numpy, scipy and opencv-python-headless 5.1.0. Running a row again gives the same file byte for byte.
`solve_for_the_board.py` gave the same output with OpenCV 5.0.0 and 5.1.0.

All of it is simulation: projected points with 0.05 px of noise, no rendered or real images. The limits are
the published ones (`src/lib/claims.ts`), applied one at a time; no production board was measured for it.
The bow from a temperature difference between the faces is a calculation (`lab.thermal_bow`).
