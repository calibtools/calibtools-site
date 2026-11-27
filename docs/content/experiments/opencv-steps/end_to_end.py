"""Renders 20 views of the board in the guide's code, as a ChArUco board and as a checkerboard, runs calibrate.py and
calibrate_checkerboard.py on them as a reader would, and compares camera.yaml with the camera the images were made with. Run: python end_to_end.py   (writes to /tmp/opencv-steps)"""
import json, os, subprocess, sys, numpy as np, cv2
from lab import *
HERE = os.path.dirname(os.path.abspath(__file__))
out = {}
for kind, script in (("charuco", "calibrate.py"), ("checker", "calibrate_checkerboard.py")):
    folder = "/tmp/opencv-steps/" + kind; os.makedirs(folder + "/images", exist_ok=True)
    board = Board(kind); rng = np.random.default_rng(4)
    for i in range(20):
        r, t = pose(board, rng, tilt=(5, 45), distance=(0.8, 1.25))
        cv2.imwrite(f"{folder}/images/{i:02d}.png", render(board, r, t, rng))
    text = subprocess.run([sys.executable, HERE + "/" + script], cwd=folder, capture_output=True, text=True, check=True).stdout
    open(HERE + "/results/" + script.replace(".py", ".txt"), "w").write(text); print(text, end="")
    fs = cv2.FileStorage(folder + "/camera.yaml", cv2.FILE_STORAGE_READ); K2, d2 = fs.getNode("K").mat(), fs.getNode("dist").mat()
    mean, worst = model_error(K2, d2)
    out[kind] = dict(fx_error_pct=float(100 * abs(K2[0, 0] - K[0, 0]) / K[0, 0]), cx_error_px=float(abs(K2[0, 2] - K[0, 2])), cy_error_px=float(abs(K2[1, 2] - K[1, 2])), model_mean_px=mean, model_worst_px=worst)
out["true"] = dict(fx=K[0, 0], cx=K[0, 2], cy=K[1, 2], k1=DIST[0])
json.dump(out, open(HERE + "/results/end_to_end.json", "w")); print(out)
