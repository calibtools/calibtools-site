# Hand-eye calibration: what makes it accurate?

Scripts and saved results behind `src/content/guides/hand-eye-calibration-opencv.md`.
`src/lib/handEyeGuide.test.ts` recomputes every number in the guide from the files in `results/`.

| File | What it does | Result file |
|---|---|---|
| `lab.py` | A simulated cell: camera on the flange, ChArUco board in the cell, robot readings with error, board poses from `solvePnP` on noisy corners, the five `calibrateHandEye` methods, the error measures and the residual. Points only, no images. numpy, scipy and OpenCV. | |
| `run.py` | 37 cases of 200 calibrations: 3 to 50 poses for two robots, 2 to 46° between poses with all five methods, rotation about one axis, translation only, corner noise, a wrong focal length, no distortion model, a wrong square size, one bad robot reading, eye-to-hand. About 2 minutes. | `results/sessions.json` |
| `eye_in_hand.py`, `eye_to_hand.py` | The code blocks of the guide, top to bottom, for the two arrangements. | |
| `end_to_end.py` | Renders 15 images per arrangement with the renderer in `../image-count/lab.py`, writes `camera.yaml` and `poses.json`, runs the two scripts above on them and compares with the truth. | `results/end_to_end.json` |
| `rotation_matters.py` | The script printed under "Try it yourself". numpy and OpenCV only. | `results/rotation_matters.txt` |

The results were made with opencv-python-headless 5.1.0.95, numpy 2 and scipy. `rotation_matters.py` printed the same with 4.12.0.88.

    python run.py 2>/dev/null
    python end_to_end.py
    python rotation_matters.py > results/rotation_matters.txt

`run.py` sends OpenCV's own error lines to stderr: the Tsai method prints one each time it gives up.
Each run in `sessions.json` holds, per method, rotation error (degrees), translation error (mm) and the error of a point
500 mm in front of the camera (mm); `null` where the method returned no valid pose.

Which Python wheels have `cv2.calibrateHandEye` was checked by importing 4.6.0.66, 4.11.0.86, 4.12.0.88, 5.0.0.93 and 5.1.0.95.

All of it is simulation. No robot and no real camera were used.
