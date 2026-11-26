"""The two rendered views in case_full.png and case_part.png (board 2 identical to board 1, whole or partly in view)
passed to each OpenCV version. Run with each version's python; output in results/versions.txt."""
import numpy as np, cv2, sys
a = cv2.aruco; d = a.getPredefinedDictionary(a.DICT_6X6_250)
def report(tag, cc, ci, z):
    if ci is None or len(ci) == 0: print(f"{cv2.__version__} {tag}: no corners"); return
    cc = np.asarray(cc).reshape(-1, 2); ci = np.asarray(ci).ravel()
    e1 = np.linalg.norm(cc - z["T1"][ci], axis=1); e2 = np.linalg.norm(cc - z["T2"][ci], axis=1)
    print(f"{cv2.__version__} {tag}: {len(ci)} corners, board1 {(e1<1).sum()}, board2 {(e2<1).sum()}, neither {((e1>=1)&(e2>=1)).sum()}, worst off board1 {e1.max():.0f} px")
for name in ("full", "part"):
    img = cv2.imread(f"case_{name}.png", 0); z = np.load(f"case_{name}.npz")
    if hasattr(a, "CharucoDetector"):
        b = a.CharucoBoard((10, 7), 30., 22., d)
        cc, ci, _, _ = a.CharucoDetector(b).detectBoard(img); report(name + " default", cc, ci, z)
        p = a.CharucoParameters()
        if hasattr(p, "checkMarkers"):
            p.checkMarkers = False
            cc, ci, _, _ = a.CharucoDetector(b, p).detectBoard(img); report(name + " checkMarkers off", cc, ci, z)
        else: print(f"{cv2.__version__} {name}: no checkMarkers switch")
    else:
        b = a.CharucoBoard_create(10, 7, 30., 22., d)
        corners, ids, _ = a.detectMarkers(img, d)
        n, cc, ci = a.interpolateCornersCharuco(corners, ids, img, b); report(name + " interpolateCornersCharuco", cc, ci, z)
