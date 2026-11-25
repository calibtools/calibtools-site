# How exactly does OpenCV place the corners of a tag? numpy and opencv-python (4.8 or newer) only.
import numpy as np, cv2

A = cv2.aruco
d = A.getPredefinedDictionary(A.DICT_APRILTAG_36h11)
board = A.GridBoard((6, 4), 0.040, 0.012, d)                 # 24 tags of 40 mm, 12 mm apart
flat = board.generateImage((3064, 2024), marginSize=32)       # 10 px per mm, 32 px of white around
obj = np.array(board.getObjPoints()).reshape(-1, 3)[:, :2]    # tag corners in meters, tag by tag
src = (32 + obj * 1e4 - 0.5).astype(np.float32)               # the same corners in the flat image (pixel centers at whole numbers)

for name, refine in (("no refinement", A.CORNER_REFINE_NONE), ("CORNER_REFINE_SUBPIX", A.CORNER_REFINE_SUBPIX),
                     ("CORNER_REFINE_CONTOUR", A.CORNER_REFINE_CONTOUR), ("CORNER_REFINE_APRILTAG", A.CORNER_REFINE_APRILTAG)):
    err = []; rng = np.random.default_rng(0)                    # the same 40 views for every method
    for view in range(40):
        # a tilted view: move the four image corners of the board by random amounts
        quad = np.float32([[250, 180], [1050, 180], [1050, 700], [250, 700]]) + rng.uniform(-90, 90, (4, 2)).astype(np.float32)
        H = cv2.getPerspectiveTransform(np.float32([[0, 0], [3064, 0], [3064, 2024], [0, 2024]]), quad)
        img = cv2.warpPerspective(flat, H, (1280, 960), flags=cv2.INTER_AREA, borderValue=120)
        img = cv2.GaussianBlur(img, (0, 0), 0.8).astype(np.float32) + rng.normal(0, 2, (960, 1280))
        img = np.clip(img, 0, 255).astype(np.uint8)
        true = cv2.perspectiveTransform(src.reshape(-1, 1, 2), H).reshape(-1, 4, 2)
        p = A.DetectorParameters(); p.cornerRefinementMethod = refine
        corners, ids, _ = A.ArucoDetector(d, p).detectMarkers(img)
        for c, i in zip(corners, ids.ravel()):
            err.append(c.reshape(4, 2) - true[i])
    err = np.concatenate(err); shift = err.mean(0); rms = lambda e: np.sqrt((e ** 2).sum(1).mean())
    print(f"{name:22s} {len(err)} corners   RMS {rms(err):.2f} px   mean shift ({shift[0]:+.2f}, {shift[1]:+.2f}) px   RMS without the shift {rms(err - shift):.2f} px")
