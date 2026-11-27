"""Runs the guide's own code on rendered images and simulated scans: ten placements of the panel, a 64-line LiDAR.
Renders each camera image (markers drawn with OpenCV, holes showing the background), writes the folder calibrate_rig.py reads,
runs it and compares the result with the truth. Run: python end_to_end.py   (writes to /tmp/lidar-camera-rig)"""
import json, os, subprocess, sys, numpy as np, cv2
from lab import *
HERE = os.path.dirname(os.path.abspath(__file__)); folder = "/tmp/lidar-camera-rig"; os.makedirs(folder, exist_ok=True)
from end_to_end_render import render
rng = np.random.default_rng(3)
for i in range(10):
    Tcb = placement(rng)
    cloud, line = scan(inv(T_CAM_LIDAR) @ Tcb, "64 lines", rng)
    cv2.imwrite(f"{folder}/{i:02d}.png", render(Tcb, rng)); np.save(f"{folder}/{i:02d}_cloud.npy", np.column_stack([cloud, line]))
fs = cv2.FileStorage(folder + "/camera.yaml", cv2.FILE_STORAGE_WRITE); fs.write("K", K); fs.write("dist", DIST.reshape(1, -1)); fs.release()
json.dump(dict(holes=HOLES.tolist(), hole_radius=HOLE_R, marker_corners=MARKER_CORNERS.tolist(), marker_ids=[0, 1, 2, 3]), open(folder + "/target.json", "w"))
log = subprocess.run([sys.executable, os.path.join(HERE, "calibrate_rig.py"), folder], capture_output=True, text=True)
if log.returncode: sys.exit(log.stderr)
open(os.path.join(HERE, "results/end_to_end.txt"), "w").write(log.stdout)
rot, tr, far = errors(np.load(folder + "/T_cam_lidar.npy"))
json.dump(dict(placements=10, lidar="64 lines", rotation_error_deg=rot, translation_error_mm=tr, at_20m_mm=far,
               truth=[[round(float(x), 4) for x in r] for r in T_CAM_LIDAR]), open(os.path.join(HERE, "results/end_to_end.json"), "w"), indent=1)
print(log.stdout); print("against the truth: rotation %.3f deg, translation %.1f mm, %.0f mm at 20 m" % (rot, tr, far))
