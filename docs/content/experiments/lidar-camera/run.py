"""100 simulated calibrations for each case. Run: python run.py 0 2 & python run.py 1 2 ; wait ; python run.py merge
(about 25 minutes on two cores)"""
import json, sys, glob, numpy as np
from lab import *
RUNS = 100
Kbad = K.copy(); Kbad[0, 0] *= 1.005; Kbad[1, 1] *= 1.005
#        name                 placements  lidar        placement kw                    scan kw                 camera kw             layout
CASES = [("baseline",           10, "64 lines", dict(),                          dict(),                  dict(),               HOLES),
         ("lidar_16",           10, "16 lines", dict(),                          dict(),                  dict(),               HOLES),
         ("lidar_32",           10, "32 lines", dict(),                          dict(),                  dict(),               HOLES),
         ("lidar_128",          10, "128 lines", dict(),                         dict(),                  dict(),               HOLES),
         ("lidar_dense",        10, "dense",    dict(),                          dict(),                  dict(),               HOLES),
         ("placements_3",        3, "64 lines", dict(),                          dict(),                  dict(),               HOLES),
         ("placements_6",        6, "64 lines", dict(),                          dict(),                  dict(),               HOLES),
         ("placements_20",      20, "64 lines", dict(),                          dict(),                  dict(),               HOLES),
         ("near_only",          10, "64 lines", dict(distance=(1.5, 2.5)),       dict(),                  dict(),               HOLES),
         ("far_only",           10, "64 lines", dict(distance=(3.0, 4.0)),       dict(),                  dict(),               HOLES),
         ("out_to_8m",          10, "64 lines", dict(distance=(1.5, 8.0)),       dict(),                  dict(),               HOLES),
         ("middle_of_view",     10, "64 lines", dict(spread=0.25),               dict(),                  dict(),               HOLES),
         ("facing_only",        10, "64 lines", dict(max_tilt=5),                dict(),                  dict(),               HOLES),
         ("range_noise_10mm",   10, "64 lines", dict(),                          dict(range_noise=0.010), dict(),               HOLES),
         ("range_noise_20mm",   10, "64 lines", dict(),                          dict(range_noise=0.020), dict(),               HOLES),
         ("range_bias_20mm",    10, "64 lines", dict(),                          dict(range_bias=0.020),  dict(),               HOLES),
         ("panel_bowed_3mm",    10, "64 lines", dict(),                          dict(bow=0.003),         dict(),               HOLES),
         ("marker_noise_0.1px", 10, "64 lines", dict(),                          dict(),                  dict(pixel_noise=0.1), HOLES),
         ("marker_noise_1px",   10, "64 lines", dict(),                          dict(),                  dict(pixel_noise=1.0), HOLES),
         ("focal_plus_0.5pct",  10, "64 lines", dict(),                          dict(),                  dict(Kc=Kbad),        HOLES),
         ("symmetric_layout",   10, "64 lines", dict(),                          dict(),                  dict(),               HOLES_SYMMETRIC)]

if __name__ == "__main__":
    if sys.argv[1:2] == ["merge"]:
        out = {}
        for f in sorted(glob.glob("results/part_*.json")):
            for k, v in json.load(open(f)).items(): out.setdefault(k, []).extend(v)
        for v in out.values(): v.sort(key=lambda r: r["run"])
        json.dump(dict(runs=RUNS, cases=out), open("results/calibrations.json", "w"), separators=(",", ":"))
        print({k: len(v) for k, v in out.items()}); sys.exit()
    part, parts = int(sys.argv[1]), int(sys.argv[2]); out = {}
    for ci, (name, n, lidar, pkw, skw, ckw, layout) in enumerate(CASES):
        rows = []
        for s in range(RUNS):
            if s % parts != part: continue
            rng = np.random.default_rng([ci, s]); data = []
            for _ in range(n + 1):                                   # one extra placement is held out of the fit
                Tcb = placement(rng, **pkw)
                cloud, line = scan(inv(T_CAM_LIDAR) @ Tcb, lidar, rng, holes=layout, **skw)
                data.append((see_markers(Tcb, rng, **ckw), cloud, line))
            res = calibrate(data[:n], holes=layout)
            if res is None: rows.append(dict(run=s, used=0)); continue
            Tm, resid, used = res; rot, tr, far = errors(Tm)
            row = dict(run=s, used=used, rot_deg=round(rot, 4), trans_mm=round(tr, 2), at_20m_mm=round(far, 1), fit_resid_mm=round(float(1000 * resid.mean()), 2))
            Tcb_m, cloud, line = data[n]
            c, misfit = find_holes(cloud, layout, HOLE_R, line) if len(cloud) >= 30 else (None, np.inf)
            if c is not None and misfit <= 0.01:
                row["holdout_mm"] = round(float(1000 * np.linalg.norm((Tm[:3, :3] @ c.T).T + Tm[:3, 3] - ((Tcb_m[:3, :3] @ layout.T).T + Tcb_m[:3, 3]), axis=1).mean()), 2)
            rows.append(row)
        out[name] = rows; ok = [r for r in rows if r["used"]]
        print(f"{name:20s} solved {len(ok):3d} used {np.median([r['used'] for r in ok]):4.1f} rot {np.median([r['rot_deg'] for r in ok]):.3f} trans {np.median([r['trans_mm'] for r in ok]):6.1f} at20m {np.median([r['at_20m_mm'] for r in ok]):7.1f} fit {np.median([r['fit_resid_mm'] for r in ok]):.1f}", flush=True)
        json.dump(out, open(f"results/part_{part}.json", "w"))
