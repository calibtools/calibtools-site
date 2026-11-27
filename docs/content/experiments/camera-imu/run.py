"""30 simulated recordings for each case, solved with the small estimator in lab.py (not Kalibr).
Run: python run.py 0 2 & python run.py 1 2 ; wait ; python run.py merge     (about 15 minutes on two cores)"""
import json, sys, glob, numpy as np
from lab import *
TRIALS = 30
#        name                 recording                                   solving
CASES = [("baseline",          dict(),                                     dict()),
         ("slow",              dict(speed=0.5),                            dict()),
         ("brisk",             dict(speed=2.0),                            dict()),
         ("one_rotation_axis", dict(rot_deg=(18, 0, 0)),                   dict()),
         ("no_rotation",       dict(rot_deg=(0, 0, 0)),                    dict()),
         ("no_translation",    dict(trans_m=(0, 0, 0)),                    dict()),
         ("seconds_20",        dict(duration=20.0),                        dict()),
         ("seconds_120",       dict(duration=120.0),                       dict()),
         ("offset_4ms_ignored",  dict(td=0.004),                           dict(estimate_td=False)),
         ("offset_20ms_ignored", dict(td=0.020),                           dict(estimate_td=False)),
         ("offset_20ms",       dict(td=0.020),                             dict()),
         ("camera_jitter_15ms", dict(cam_jitter=0.015),                    dict()),
         ("imu_bursts_of_10",  dict(imu_batch=10),                         dict()),
         ("grid_1pct_large",   dict(grid_scale=1.01),                      dict()),
         ("shock_kept",        dict(shock=True),                           dict(trim=(0.0, 1.0))),
         ("shock_trimmed",     dict(shock=True),                           dict(trim=(1.0, 1.0))),
         ("corner_noise_0.3",  dict(pixel_noise=0.3),                      dict())]

if __name__ == "__main__":
    if sys.argv[1:2] == ["merge"]:
        out = {}
        for f in sorted(glob.glob("results/part_*.json")):
            for k, v in json.load(open(f)).items(): out.setdefault(k, []).extend(v)
        for v in out.values(): v.sort(key=lambda r: r["trial"])
        json.dump(dict(trials=TRIALS, cases=out, truth=dict(translation_mm=[round(1000 * v, 1) for v in P_CI_TRUE], cam_hz=CAM_HZ, imu_hz=IMU_HZ)),
                  open("results/recordings.json", "w"), separators=(",", ":"))
        print({k: len(v) for k, v in out.items()}); sys.exit()
    part, parts = int(sys.argv[1]), int(sys.argv[2]); out = {}
    for name, rec_kw, sol_kw in CASES:
        rows = []
        for s in range(TRIALS):
            if s % parts != part: continue
            rng = np.random.default_rng([CASES.index((name, rec_kw, sol_kw)), s])
            rec = record(rng, **rec_kw); td = rec_kw.get("td", 0.004)
            try:
                res = calibrate(rec, **sol_kw); rot, tr, dt = errors(res, td)
                rows.append(dict(trial=s, rot_deg=round(rot, 4), trans_mm=round(tr, 3), offset_err_ms=round(dt, 4), offset_ms=round(1000 * res["td"], 4),
                                 gyro_resid=round(res["gyro_resid"], 5), acc_resid=round(res["acc_resid"], 4), gravity=round(res["gravity"], 4), images=len(rec["tc"])))
            except Exception as e:
                rows.append(dict(trial=s, failed=repr(e)[:80]))
        out[name] = rows; ok = [r for r in rows if "failed" not in r]
        print(f"{name:20s} ok {len(ok):2d} rot {np.median([r['rot_deg'] for r in ok]):.3f} deg  trans {np.median([r['trans_mm'] for r in ok]):.2f} mm  offset err {np.median([abs(r['offset_err_ms']) for r in ok]):.3f} ms", flush=True)
        json.dump(out, open(f"results/part_{part}.json", "w"))
