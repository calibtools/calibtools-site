"""Does cv2.calibrateCameraRO (object-releasing) recover a bowed print?
Same setup as printed-target-sim.py. iFixedPoint = top-right corner of the first row."""
import numpy as np, cv2, importlib.util, sys
spec = importlib.util.spec_from_file_location('sim', sys.argv[1]); sim = importlib.util.module_from_spec(spec); spec.loader.exec_module(sim)
for kind, v in [(None, 0), ('bow', 1.0), ('bow', 2.0), ('dome', 2.0), ('wave', 0.5), ('aniso', 0.003), ('combo', 1)]:
    tb = sim.deform(kind, v) if kind else sim.NOMINAL
    rr = []
    for trial in range(15):
        rng = np.random.default_rng(trial); P = sim.poses(rng); obj, img = [], []
        for rv, t in P:
            pr, _ = cv2.projectPoints(tb, rv, t, sim.K_TRUE, sim.D_TRUE)
            img.append((pr.reshape(-1, 2) + rng.normal(0, sim.NOISE, (len(tb), 2))).astype(np.float32)); obj.append(sim.NOMINAL.astype(np.float32))
        r1, K1, d1, *_ = cv2.calibrateCamera(obj, img, (sim.W, sim.H), None, None)
        out = cv2.calibrateCameraRO(obj, img, (sim.W, sim.H), sim.COLS - 1, None, None)
        r2, K2, d2 = out[0], out[1], out[2]
        rr.append([r1, (K1[0,0]/sim.K_TRUE[0,0]-1)*100, sim.edge_error(K1, d1), r2, (K2[0,0]/sim.K_TRUE[0,0]-1)*100, sim.edge_error(K2, d2)])
    m = np.median(rr, 0)
    print(f"{str(kind)+' '+str(v):10s} plain: RMS {m[0]:.3f} fx {m[1]:+.2f}% edge {m[2]:6.1f}px | RO: RMS {m[3]:.3f} fx {m[4]:+.2f}% edge {m[5]:6.1f}px")
