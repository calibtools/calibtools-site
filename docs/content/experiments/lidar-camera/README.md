# LiDAR-camera calibration: what matters?

Scripts and saved results behind `src/content/guides/lidar-camera-calibration.md`.
`src/lib/lidarCameraGuide.test.ts` recomputes every number in the guide from the files in `results/` and checks that the
code blocks in the guide are parts of `pipeline.py`, `calibrate_rig.py` and `try_holes.py`.

| File | What it does | Result file |
|---|---|---|
| `pipeline.py` | The hole finder printed in the guide: plane fit, rim points along each scan line, layout fit, and the rigid fit. | |
| `lab.py` | The simulated rig: a 600 × 400 mm panel with four holes and four markers, a camera 12 cm above the LiDAR, five LiDAR scan patterns, placements, scans, marker corners with noise. | |
| `detect.py` | 200 placements per LiDAR pattern and distance band, and per hole size: how often all four hole centers are found and how far off they are. | `results/detect.json` |
| `run.py` | 21 cases of 100 calibrations: LiDAR pattern, number and place of the placements, range noise and offset, a bowed panel, marker corner noise, a wrong focal length, a symmetric hole layout. | `results/calibrations.json` |
| `symmetric.py` | With a symmetric layout, how often the layout fit comes back turned by 180°. | `results/symmetric.json` |
| `old_method_code.py`, `old_method.py` | The hole finder of the earlier version of the guide, on the same placements as `detect.py`. | `results/old_method.json` |
| `calibrate_rig.py` | The rest of the guide's code as one script: marker pose, the loop over placements, the fit, the projection. | |
| `end_to_end_render.py`, `end_to_end.py` | Renders ten camera images, simulates ten 64-line scans, runs `calibrate_rig.py` on them and compares with the truth. | `results/end_to_end.txt`, `results/end_to_end.json` |
| `corner_refinement.py` | Ten sets of ten rendered placements solved with three corner refinement settings of the ArUco detector. | `results/corner_refinement.json` |
| `try_holes.py` | The script printed under "Try it yourself". | `results/try_holes.txt` |

Made with opencv-python-headless 5.1.0.95, numpy 2 and scipy. Run from this folder:

    python detect.py
    python run.py 0 2 & python run.py 1 2 ; wait ; python run.py merge
    python symmetric.py
    python old_method.py
    python end_to_end.py
    python corner_refinement.py
    python try_holes.py > results/try_holes.txt

All of it is simulation. No LiDAR and no camera were used. The beams have no width, so mixed returns at a hole's rim
are not in it.
