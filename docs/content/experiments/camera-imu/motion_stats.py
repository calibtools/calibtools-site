"""How fast the simulated rig turns and accelerates at each pace: medians over ten motions of 60 s."""
import json, numpy as np
from lab import motion, P_CI_TRUE
out = {}
for name, speed in (("slow", 0.5), ("baseline", 1.0), ("brisk", 2.0)):
    w, a = [], []
    for s in range(10):
        R, p, om = motion(np.random.default_rng(s), speed=speed); t = np.arange(1, 59, 0.01)
        w.append(np.degrees(np.linalg.norm(om(t), axis=1))); a.append(np.linalg.norm(p(t, 2), axis=1))
    out[name] = dict(turn_deg_per_s=float(np.median(w)), acceleration_m_s2=float(np.median(a)))
out["imu_to_camera_mm"] = float(1000 * np.linalg.norm(P_CI_TRUE))
json.dump(out, open("results/motion_stats.json", "w"), indent=1); print(out)
