# Two boards in one image: do they need different marker IDs?

Scripts and saved results behind `src/content/guides/multi-board-marker-ids.md`.
`src/lib/multiBoardGuide.test.ts` recomputes every number in the guide from the files in `results/`.

| File | What it does | Result file |
|---|---|---|
| `lab.py` | Camera, ChArUco boards, renderer, the two-board rig and the model comparison. numpy, scipy and OpenCV only. | |
| `run.py` | 20 sessions of 20 images of the two-board rig: separate IDs (board 1, both boards) and the same IDs with the check on and off. About 2 minutes. | `results/sessions.json` |
| `duplicates.py` | 300 images with board 1 in view and an identical board 2 entering from the side: repeated IDs against corners returned. About 1 minute. | `results/duplicates.json` |
| `reach.py` | One board at growing distance, 12 images per step, for seven dictionaries: markers decoded and misread. About 3 minutes. | `results/reach.json` |
| `dicts.py` | Smallest bit distance and corrected bits of each OpenCV dictionary, and which small dictionaries are the start of larger ones. | `results/dicts.txt` |
| `mkcase.py` | Renders the two images `vers.py` reads (`case_full.png`, `case_part.png`, not kept in the repository). | |
| `vers.py` | Passes the two images to one OpenCV version. Run with each version's python and append to the result file. | `results/versions.txt` |
| `same_ids.py` | The script printed in the guide. Flat images, numpy and opencv-python 4.12 or later. | `results/same_ids.txt` |
| `figure.py` | Detection behind the guide's first figure. Run from the repository root, then `pnpm guides:figures`. | `src/data/same-ids-detection.json` |

The results were made with opencv-python-headless 5.1.0.95 (numpy 2, scipy). `results/versions.txt` used
opencv-contrib-python-headless 4.6.0.66, 4.7.0.72, 4.8.0.76 and 4.12.0.88, opencv-python-headless 4.9.0.80,
4.10.0.84, 4.11.0.86 and 5.1.0.95, in that order. `same_ids.py` printed the same output with 4.12 and 5.1.

    python run.py
    python duplicates.py
    python reach.py
    python dicts.py > results/dicts.txt
    python mkcase.py
    for py in <one python per version>; do $py vers.py >> results/versions.txt; done
    python same_ids.py > results/same_ids.txt

Run the scripts from this folder without `-I`, so that they find `lab.py`.

The Kalibr statements in the guide come from reading its source at commit `1f60227`
(`aslam_cv/aslam_cameras_april/src/GridCalibrationTargetAprilgrid.cpp`); Kalibr was not run.
The OpenCV board check is `CharucoDetectorImpl::checkBoard` in `modules/objdetect/src/aruco/charuco_detector.cpp`.

All of it is simulation. No real camera images are in this folder.
