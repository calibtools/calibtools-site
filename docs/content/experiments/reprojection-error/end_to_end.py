"""Renders 20 views, one of them sheared by up to 5 px as by a rolling shutter, runs check.py on them as a reader
would, and compares the calibration with and without the flagged view against the true camera.
Run: python end_to_end.py   (writes images to /tmp/reprojection-error)"""
import json, os, subprocess, sys, numpy as np, cv2
from lab import *
HERE = os.path.dirname(os.path.abspath(__file__)); folder = "/tmp/reprojection-error"; os.makedirs(folder + "/images", exist_ok=True)
board = Board(); rng = np.random.default_rng(7); BAD = 13; obj, img = [], []
for i in range(20):
    r, t = pose(board, rng, tilt=(10, 35), distance=(0.8, 1.25))
    im = render(board, r, t, rng, shear=5.0 if i == BAD else 0.0)
    cv2.imwrite(f"{folder}/images/{i:02d}.png", im)
    cc, ci = detect_charuco(board, im); obj.append(board.corners[ci].astype(np.float32)); img.append(cc.astype(np.float32))
text = subprocess.run([sys.executable, HERE + "/check.py"], cwd=folder, capture_output=True, text=True, check=True).stdout
open(HERE + "/results/check.txt", "w").write(text); print(text, end="")
def worst(o, p):
    rms, K2, d2, _, _ = cv2.calibrateCamera(o, p, (W, H), None, None)
    return dict(rms=rms, model_worst=model_error(K2, d2)[1])
keep = [i for i in range(20) if i != BAD]
res = dict(sheared_view=f"images/{BAD:02d}.png", all_views=worst(obj, img), without_it=worst([obj[i] for i in keep], [img[i] for i in keep]))
json.dump(res, open(HERE + "/results/end_to_end.json", "w")); print(res)
