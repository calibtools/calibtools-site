# Which calibration target?

Scripts and saved results behind `src/content/guides/charuco-vs-checkerboard-vs-aprilgrid.md`.
`src/lib/targetChoiceGuide.test.ts` recomputes every number in the guide from the files in `results/`.

| File | What it does | Result file |
|---|---|---|
| `tag_corners.py` | The script printed in the guide. OpenCV's four corner methods on an AprilTag grid; numpy and opencv-python only. | `results/tag_corners.txt` |
| `lab.py` | The five boards, the views, the truth, the model comparison, and the detectors that are not Plumbline's. | |
| `accuracy.py` | Distance from each found point to the true one: 8 detectors, 5 conditions, 60 views each. About 8 minutes. | `results/accuracy.json` |
| `models.py` | 20 sessions of 24 views for each board, whole board in view and board over the edge, plus the AprilGrid with OpenCV's tag corners. About 25 minutes. | `results/models.json` |

`lab.py` and the two scripts that import it need the Plumbline core package (`github.com/calibtools/plumbline`,
the results were made at commit `a45b113`) plus numpy, scipy and opencv-python-headless 5.1.0:

    python accuracy.py <plumbline>/src
    python models.py <plumbline>/src

Both take names after the path to run only those rows again and keep the rest of the saved file.
`tag_corners.py` gave the same output with OpenCV 5.0.0 and 5.1.0.

All of it is simulation. No real camera images are in this folder.
