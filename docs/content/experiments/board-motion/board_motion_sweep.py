import numpy as np, cv2, sys
sys.path.insert(0, '.')
import board_motion as bm
def run(seed, shift, n_moving=2):
    rng = np.random.default_rng(seed); poses = [bm.random_pose(rng) for _ in range(24)]
    idx = rng.choice(24, n_moving, replace=False); sg = rng.choice([-1, 1], n_moving)
    mv = {int(i): shift * int(s) for i, s in zip(idx, sg)}
    views = [bm.observe(r, t, rng, mv.get(i, 0.0)) for i, (r, t) in enumerate(poses)]
    rms, K, pv = bm.calibrate(views); med = np.median(pv)
    kept = [v for i, v in enumerate(views) if i not in mv]; rms2, K2, _ = bm.calibrate(kept)
    pp = np.hypot(K[0, 2] - 640, K[1, 2] - 480); pp2 = np.hypot(K2[0, 2] - 640, K2[1, 2] - 480)
    flagged = set(np.flatnonzero(pv > 3 * med).tolist())
    return rms, rms2, pp, pp2, abs(K[0, 0] - 1500), abs(K2[0, 0] - 1500), len(flagged & set(mv)), len(flagged - set(mv)), min(pv[i] for i in mv) / med
for shift in (0.0, 0.25, 0.5, 1.0, 2.0, 4.0):
    R = np.array([run(s, shift) for s in range(1, 201)])
    print(f"shift {shift:4.2f} mm: RMS {np.median(R[:,0]):.3f} -> {np.median(R[:,1]):.3f} | principal point off {np.median(R[:,2]):.2f} (90th pct {np.percentile(R[:,2],90):.2f}) -> {np.median(R[:,3]):.2f} | fx off {np.median(R[:,4]):.2f} -> {np.median(R[:,5]):.2f} | flagged {int(R[:,6].sum())}/400, clean flagged {int(R[:,7].sum())} | smaller moving bar / median: {np.median(R[:,8]):.1f}")
