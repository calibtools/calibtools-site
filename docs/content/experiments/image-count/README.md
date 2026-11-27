# How many images does camera calibration need?

Scripts and saved results behind `src/content/guides/how-many-calibration-images.md`.
`src/lib/imageCountGuide.test.ts` recomputes every number in the guide from the files in `results/`.

| File | What it does | Result file |
|---|---|---|
| `lab.py` | Camera, ChArUco board, renderer (every pixel traced through the true lens), the two kinds of view and the model comparison. numpy, scipy and OpenCV only. | |
| `pool.py` | Renders and detects 400 spread views and 120 views near the middle of the frame; keeps corners, IDs and poses, not the images. Writes the first 24 spread images to `/tmp/image-count-session/` for `enough_images.py`. About 1 minute. | `results/pool.npz`, `results/pool_summary.json` |
| `run.py` | 20 sessions for each of 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40 and 60 images drawn from the pool, with default flags and with `CALIB_FIX_K3 \| CALIB_ZERO_TANGENT_DIST`; 10, 20 and 60 images near the middle. 60 spread views are held out for the check. About 2 minutes. | `results/sessions.json` |
| `enough_images.py` | The script printed in the guide: calibrate on all images in a folder, then on ten random halves. | `results/enough_images_24.txt`, `results/enough_images_8.txt` |

The results were made with opencv-contrib-python-headless 4.14.0, numpy 2 and scipy.

    python pool.py
    python run.py
    python enough_images.py /tmp/image-count-session > results/enough_images_24.txt
    mkdir /tmp/ic8 && cp /tmp/image-count-session/view_0[0-7].png /tmp/ic8/
    python enough_images.py /tmp/ic8 > results/enough_images_8.txt

Run the scripts from this folder without `-I`, so that they find `lab.py`. `pool_summary.json` is written by `pool.py`.

All of it is simulation. No real camera images are in this folder.
