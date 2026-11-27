# How do you calibrate a camera with OpenCV?

Scripts and saved results behind `src/content/guides/opencv-camera-calibration.md`.
`src/lib/opencvStepsGuide.test.ts` recomputes every number in the guide from the files in `results/` and checks that
the two scripts printed in the guide, and their output, are the files here.

| File | What it does | Result file |
|---|---|---|
| `lab.py` | The board of the guide's code (10 × 7 squares of 25 mm, ChArUco or plain checkerboard) rendered through a known camera: 1920 × 1440 px, focal length 2250 px, k1 = −0.12. Poses, detection, and the error of a solved camera model against the true one. | |
| `run.py` | 7 ways of taking 20 views, 20 sessions each: tilt range, distance range, board across the frame or always in the middle. Each session solved with the default, the rational and a two-term distortion model. | `results/sessions.json` |
| `detectors.py` | 400 views rendered as a ChArUco board and as a checkerboard; corners from `CharucoDetector`, `findChessboardCornersSB` and `findChessboardCorners` + `cornerSubPix` against their true positions. | `results/detectors.json` |
| `calibrate.py`, `calibrate_checkerboard.py` | The two scripts printed in the guide. | `results/calibrate.txt`, `results/calibrate_checkerboard.txt` |
| `end_to_end.py` | Renders 20 views each way, runs the two scripts on them and compares `camera.yaml` with the true camera. | `results/end_to_end.json` |

Made with opencv-python-headless 5.1.0.95, numpy 2 and scipy. Run from this folder:

    python run.py 0 2 & python run.py 1 2 ; wait ; python run.py merge
    python detectors.py
    python end_to_end.py

Whether `CharucoDetector`, `setLegacyPattern` and `findChessboardCornersSB` exist was checked by hand on
opencv-contrib-python-headless 4.6.0.66, 4.7.0.72 and 4.8.0.76: `CharucoDetector` from 4.7, `setLegacyPattern` from 4.8,
`findChessboardCornersSB` in all three.

All of it is simulation. No camera was used.
