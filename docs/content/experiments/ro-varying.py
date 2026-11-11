"""Bow that changes from view to view (a sheet that flexes while handled): 0 to 2 mm, random per view.
Plain calibrateCamera vs calibrateCameraRO. Same setup as printed-target-sim.py."""
import numpy as np, cv2, importlib.util, sys
spec = importlib.util.spec_from_file_location('sim', sys.argv[1]); sim = importlib.util.module_from_spec(spec); spec.loader.exec_module(sim)
for lo, hi in [(0.0, 1.0), (0.0, 2.0)]:
    rr = []
    for trial in range(15):
        rng = np.random.default_rng(100 + trial); P = sim.poses(rng); obj, img = [], []
        for rv, t in P:
            tb = sim.deform('bow', rng.uniform(lo, hi) + 1e-6)
            pr, _ = cv2.projectPoints(tb, rv, t, sim.K_TRUE, sim.D_TRUE)
            img.append((pr.reshape(-1, 2) + rng.normal(0, sim.NOISE, (len(tb), 2))).astype(np.float32)); obj.append(sim.NOMINAL.astype(np.float32))
        r1, K1, d1, *_ = cv2.calibrateCamera(obj, img, (sim.W, sim.H), None, None)
        out = cv2.calibrateCameraRO(obj, img, (sim.W, sim.H), sim.COLS - 1, None, None)
        rr.append([r1, (K1[0,0]/sim.K_TRUE[0,0]-1)*100, sim.edge_error(K1, d1), out[0], (out[1][0,0]/sim.K_TRUE[0,0]-1)*100, sim.edge_error(out[1], out[2])])
    m = np.median(rr, 0)
    print(f"bow {lo}-{hi} mm varying  plain: RMS {m[0]:.3f} fx {m[1]:+.2f}% edge {m[2]:6.1f}px | RO: RMS {m[3]:.3f} fx {m[4]:+.2f}% edge {m[5]:6.1f}px")
