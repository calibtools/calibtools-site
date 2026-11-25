"""How exactly does each pattern's detector place its points? 60 views a condition, every board fully in the image."""
import json, sys
from multiprocessing import Pool
from lab import *

CONDITIONS = {  # name: (blur sigma px, noise sigma, fill of image width, max tilt deg)
    "standard":   (0.8, 2.0, (0.45, 0.8), 35.0),
    "soft_focus": (2.5, 2.0, (0.45, 0.8), 35.0),
    "small":      (0.8, 2.0, (0.18, 0.28), 35.0),
    "steep":      (0.8, 2.0, (0.45, 0.8), 60.0),
    "noisy":      (0.8, 8.0, (0.45, 0.8), 35.0),
}
N = 60

# name: (board, detector). None = Plumbline's detector for that board.
METHODS = {
    "checkerboard_sb":      ("checkerboard", None),   # findChessboardCornersSB
    "checkerboard_classic": ("checkerboard", lambda g, T: classic_checkerboard(g, T)),
    "charuco":              ("charuco", None),         # CharucoDetector
    "aprilgrid_none":       ("aprilgrid", lambda g, T: opencv_tags(g, T, cv2.aruco.CORNER_REFINE_NONE)),
    "aprilgrid_subpix":     ("aprilgrid", lambda g, T: opencv_tags(g, T, cv2.aruco.CORNER_REFINE_SUBPIX)),
    "aprilgrid_edges":      ("aprilgrid", None),       # Plumbline: a line fitted to each tag edge
    "circles":              ("circles", None),         # findCirclesGrid
    "asym_circles":         ("asym_circles", None),
}

def run(job):
    method, cond = job; name, fn = METHODS[method]; T = BOARDS[name]; blur, noise, fill, tilt = CONDITIONS[cond]
    rng = np.random.default_rng(100); errs = []; seen = 0; complete = 0
    for rv, tv in poses(T, N, 11, 0.0, fill, tilt):
        img = synth.render(T, CAM, rv, tv, rng, noise_sigma=noise, blur=blur)
        det = detect(img, T, "v") if fn is None else fn(img, T)
        e = point_errors(T, det, rv, tv)
        if len(e): seen += 1; errs.extend(e.tolist())
        complete += len(e) == len(T.object_points())
    e = np.array(errs)
    return dict(method=method, board=name, condition=cond, views=N, views_detected=seen, views_complete=complete, points=len(T.object_points()),
                points_found=int(len(e)), rms_px=float(np.sqrt((e ** 2).mean())) if len(e) else None,
                p95_px=float(np.percentile(e, 95)) if len(e) else None, over_1px=int((e > 1.0).sum()))

if __name__ == "__main__":
    only = sys.argv[2:]  # method names: run these again and keep the other rows of the saved file
    jobs = [(m, c) for c in CONDITIONS for m in METHODS if not only or m in only]
    with Pool(4) as p: rows = p.map(run, jobs)
    if only:
        old = [r for r in json.load(open("results/accuracy.json"))["rows"] if r["method"] not in only]
        rows = sorted(old + rows, key=lambda r: (list(CONDITIONS).index(r["condition"]), list(METHODS).index(r["method"])))
    json.dump(dict(camera="1280x960, f=1500 px", views_per_condition=N, conditions={k: dict(blur=v[0], noise=v[1], fill=v[2], tilt=v[3]) for k, v in CONDITIONS.items()}, rows=rows), open("results/accuracy.json", "w"), indent=1)
    for r in rows: print(f"{r['condition']:11s} {r['method']:21s} views {r['views_detected']:2d}/{N} complete {r['views_complete']:2d} pts {r['points_found']:5d} rms {r['rms_px'] or 0:.3f} p95 {r['p95_px'] or 0:.3f} >1px {r['over_1px']}")
