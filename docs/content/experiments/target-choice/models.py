"""Does a board that may hang over the image border give a better camera model? 24 views a session, 20 sessions a row.

inside: the whole printed pattern is in every image (what a checkerboard or a circle grid needs).
edges:  the same kind of views, but the board centre may go up to 90 % of the way to where half the board is outside.
"""
import json, sys
from multiprocessing import Pool
from lab import *
from plumbline.core.detect import Detection

SESSIONS, VIEWS = 20, 24
ROWS = [(b, plan) for b in ("checkerboard", "charuco", "aprilgrid", "circles", "asym_circles") for plan in ("inside", "edges")]
# The same AprilGrid images with the tag corners as OpenCV's marker detector gives them.
ROWS += [("aprilgrid_cv_subpix", "inside"), ("aprilgrid_cv_none", "inside")]
BOARD_OF = {"aprilgrid_cv_subpix": "aprilgrid", "aprilgrid_cv_none": "aprilgrid"}

def find(img, T, i, name):
    if name == "checkerboard": d = classic_checkerboard(img, T)  # the more exact of the two checkerboard detectors in accuracy.py
    elif name == "aprilgrid_cv_subpix": d = opencv_tags(img, T, cv2.aruco.CORNER_REFINE_SUBPIX)
    elif name == "aprilgrid_cv_none": d = opencv_tags(img, T, cv2.aruco.CORNER_REFINE_NONE)
    else: return detect(img, T, f"{i:02d}")
    return Detection(f"{i:02d}", CAM.width, CAM.height, d.ids.astype(np.int32), d.corners)

def session(job):
    name, plan, seed = job; T = BOARDS[BOARD_OF.get(name, name)]; rng = np.random.default_rng(5000 + seed)
    dets = [find(synth.render(T, CAM, rv, tv, rng), T, i, name) for i, (rv, tv) in enumerate(poses(T, VIEWS, 300 + seed, 0.0 if plan == "inside" else 0.9))]
    used = [d for d in dets if len(d.ids) >= 6]
    out = dict(board=name, plan=plan, seed=seed, views_used=len(used), points=int(sum(len(d.ids) for d in used)), coverage=coverage(used))
    try:
        res = calibrate(dets, T, None, set())
        mean, worst = aligned_difference(res.camera_matrix, res.distortion)
        out.update(solved=True, rms=float(res.rms_point), model_mean=mean, model_max=worst,
                   f_err=float(abs(res.fx - CAM.K[0, 0])), pp_err=float(np.hypot(res.camera_matrix[0, 2] - CAM.K[0, 2], res.camera_matrix[1, 2] - CAM.K[1, 2])))
    except Exception as e:
        out.update(solved=False, why=str(e)[:80])
    return out

if __name__ == "__main__":
    only = sys.argv[2:]  # board names: run these again and keep the other runs of the saved file
    jobs = [(b, p, s) for b, p in ROWS for s in range(SESSIONS) if not only or b in only]
    with Pool(4) as pool: runs = pool.map(session, jobs, chunksize=2)
    if only: runs = [x for x in json.load(open("results/models.json"))["runs"] if x["board"] not in only] + runs
    table = []
    for b, p in ROWS:
        r = [x for x in runs if x["board"] == b and x["plan"] == p]; ok = [x for x in r if x["solved"]]
        med = lambda k, src=None: float(np.median([x[k] for x in (src if src is not None else r)])) if (src if src is not None else r) else None
        table.append(dict(board=b, plan=p, sessions=len(r), solved=len(ok), views_used=med("views_used"), points=med("points"), coverage=med("coverage"),
                          rms=med("rms", ok), model_mean=med("model_mean", ok), model_max=med("model_max", ok), f_err=med("f_err", ok), pp_err=med("pp_err", ok),
                          model_max_worst=max((x["model_max"] for x in ok), default=None)))
    json.dump(dict(sessions=SESSIONS, views=VIEWS, table=table, runs=runs), open("results/models.json", "w"), indent=1)
    for t in table: print(f"{t['board']:13s} {t['plan']:6s} solved {t['solved']:2d}/{t['sessions']} views {t['views_used']:4.1f} pts {t['points']:6.0f} cover {t['coverage']:.2f} rms {t['rms'] or 0:.3f} model {t['model_mean'] or 0:.3f}/{t['model_max'] or 0:.3f} (worst {t['model_max_worst'] or 0:.2f}) f {t['f_err'] or 0:.2f} pp {t['pp_err'] or 0:.2f}")
