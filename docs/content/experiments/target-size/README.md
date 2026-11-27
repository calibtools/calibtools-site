# How big should the calibration board be in the frame?

Scripts and saved results behind `src/content/guides/calibration-target-size.md`.
`src/lib/targetSizeGuide.test.ts` recomputes every number in the guide from the files in `results/`.

| File | What it does | Result file |
|---|---|---|
| `lab.py` | Camera, ChArUco board (14 × 9 or 28 × 18 on 280 × 180 mm), renderer (every pixel traced through the true lens), the three ways of placing the board and the model comparison. numpy, scipy and OpenCV only. | |
| `run.py` | 15 cases, 20 sessions of 20 images each: the board at 20 to 80 % of the image width moved around the frame, the same held in the middle, 60 to 100 % partly outside the image, a 28 × 18 board, and tilts held to 10°. Each session is solved with default flags and with `CALIB_FIX_K3 \| CALIB_ZERO_TANGENT_DIST`. About 30 minutes on one core. | `results/sessions.json` |
| `pixels.py` | The board at 41 down to 10 px per square, 40 images per step: markers decoded, corners found, corner error. | `results/pixels.json` |
| `coverage.py` | The script printed in the guide: which cells of the frame got corners in a folder of images. | `results/coverage_moved.txt`, `results/coverage_middle.txt` |
| `examples.py` | Writes the 20 images of session 0 of `spread_20` and `centre_20` to `/tmp`, the folders `coverage.py` was run on. | |
| `figure.py` | Board outlines of those two sessions and the medians shown in the guide's first figure. Run from the repository root, then `pnpm guides:figures`. | `src/data/target-size-placement.json` |

The results were made with opencv-python-headless 5.1.0.95, numpy 2 and scipy.

    python run.py 0 2 & python run.py 1 2 ; wait ; python run.py merge
    python pixels.py
    python examples.py
    python coverage.py /tmp/target-size-moved > results/coverage_moved.txt
    python coverage.py /tmp/target-size-middle > results/coverage_middle.txt

Run the scripts from this folder without `-I`, so that they find `lab.py`. In the saved files `null` stands where nothing was detected.

All of it is simulation. No real camera images are in this folder.
