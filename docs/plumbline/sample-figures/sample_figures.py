"""The figures /plumbline/ shows for the built-in sample, worked out with the release's own code.
Run: python sample_figures.py <path to calibtools/plumbline/src at tag v0.1.0-beta.1>, with opencv-python-headless 5.0.0.
Mirrors app.try_sample (same poses, seed, spoiled images, PNG round trip) and the first two calibrations."""
import json, sys
import numpy as np, cv2
sys.path.insert(0, sys.argv[1])
from plumbline.core import synth
from plumbline.core.targets import Target, CHARUCO
from plumbline.core.detect import detect
from plumbline.core.calibrate import calibrate, coverage_grid
from plumbline.core.export import ros_camera_info

SAMPLE_TARGET = Target(CHARUCO, 11, 8, 30.0, 22.0, "DICT_5X5_250")
SAMPLE_COUNT, SAMPLE_SPOILED = 24, {6: 2.0, 17: -2.0}
cam, rng = synth.default_camera(), np.random.default_rng(1007)
imgs = []
for i, (r, t) in enumerate(synth.sample_poses(SAMPLE_TARGET, cam, SAMPLE_COUNT)):
    im = synth.render_moving(SAMPLE_TARGET, cam, r, t, SAMPLE_SPOILED[i], rng) if i in SAMPLE_SPOILED else synth.render(SAMPLE_TARGET, cam, r, t, rng)
    ok, buf = cv2.imencode(".png", im); imgs.append(cv2.imdecode(buf, cv2.IMREAD_UNCHANGED))
dets = [detect(im, SAMPLE_TARGET, f"sample-{i + 1:02d}.png") for i, im in enumerate(imgs)]
full = calibrate(dets, SAMPLE_TARGET)
kept = calibrate(dets, SAMPLE_TARGET, None, set(SAMPLE_SPOILED))
grid, share = coverage_grid(dets, 1280, 960)
per = lambda res: [round(v.rms_point, 4) for v in sorted(res.views, key=lambda v: v.index)]
print(json.dumps({
  "opencv": cv2.__version__,
  "focalPx": round(full.fx, 2), "rmsPx": round(full.rms_point, 3), "corners": int(sum(d.count for d in dets)),
  "errorsPx": per(full), "coverage": grid.tolist(), "coverageShare": round(share, 4),
  "kept": {"focalPx": round(kept.fx, 2), "rmsPx": round(kept.rms_point, 3),
           "corners": int(sum(d.count for i, d in enumerate(dets) if i not in SAMPLE_SPOILED)),
           "errorsPx": per(kept), "cameraInfo": ros_camera_info(kept)},
}))
