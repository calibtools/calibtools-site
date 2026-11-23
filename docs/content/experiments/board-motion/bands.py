import sys, json; sys.argv = [sys.argv[0], sys.argv[1]]
from lab import *
T = SAMPLE; poses = synth.sample_poses(T, CAM, 24)
t0 = time.time()
def run(name, maker, bad=(6, 17)):
    rng = np.random.default_rng(1007)
    imgs = [maker(i, r, t, rng) if i in bad else still(T, r, t, rng) for i, (r, t) in enumerate(poses)]
    dets = session(T, poses, imgs)
    a, _ = solve(T, dets); b, _ = solve(T, dets, bad)
    row = dict(name=name, usable=sum(d.usable for d in dets), rms=a['rms'], fx=a['fx'], e07=a['per'].get(6), e18=a['per'].get(17),
               rest_max=max(v for k, v in a['per'].items() if k not in bad), truth_mean=a['truth_mean'], truth_max=a['truth_max'],
               flagged=[i + 1 for i in a['flagged']], rms_wo=b['rms'], fx_wo=b['fx'], truth_mean_wo=b['truth_mean'])
    print(json.dumps({k: (round(v, 4) if isinstance(v, float) else v) for k, v in row.items()})); sys.stdout.flush()
    return row, imgs
out = []
sign = lambda i: 1 if i == 6 else -1
r, _ = run("still", lambda i, r, t, g: still(T, r, t, g)); out.append(r)
for bands in (12, 48, 240, 960):
    r, im = run(f"rolling x 2mm bands={bands}", lambda i, r, t, g: rolling(T, r, t, g, (2.0 * sign(i), 0, 0), bands=bands)); out.append(r)
    if bands == 960: pass
print("z of 07, 18:", round(float(poses[6][1][2])), round(float(poses[17][1][2])), "px per mm:", round(px_of(1, poses[6][1][2]), 2), round(px_of(1, poses[17][1][2]), 2))
json.dump(out, open("results/bands.json", "w"), indent=1); print("time", round(time.time() - t0))
