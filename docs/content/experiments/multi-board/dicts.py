"""Smallest bit distance between any two markers of each OpenCV dictionary, rotations included, and how many bits OpenCV corrects."""
import numpy as np, cv2
a = cv2.aruco
def bits(d, i):
    n = d.markerSize
    return a.Dictionary.getBitsFromByteList(d.bytesList[i:i + 1], n).reshape(n, n)
for name in ["DICT_4X4_50", "DICT_4X4_250", "DICT_5X5_100", "DICT_5X5_250", "DICT_5X5_1000", "DICT_6X6_250", "DICT_6X6_1000", "DICT_7X7_250", "DICT_7X7_1000", "DICT_APRILTAG_36h11"]:
    d = a.getPredefinedDictionary(getattr(a, name))
    N = d.bytesList.shape[0]
    B = np.array([bits(d, i).ravel() for i in range(N)], np.uint8)
    R = np.array([[np.rot90(bits(d, i), k).ravel() for k in range(4)] for i in range(N)], np.uint8)  # N,4,n*n
    best = 10**9
    for i in range(N):
        dist = (R[i][None, :, :] != B[:, None, :]).sum(2).min(1); dist[i] = 10**9
        best = min(best, int(dist.min()))
    print(f"{name} markers {N} min_distance {best} correction_bits {d.maxCorrectionBits}")
for small, large in [("DICT_4X4_50", "DICT_4X4_250"), ("DICT_5X5_100", "DICT_5X5_1000"), ("DICT_6X6_250", "DICT_6X6_1000"), ("DICT_7X7_250", "DICT_7X7_1000")]:
    x = a.getPredefinedDictionary(getattr(a, small)).bytesList; y = a.getPredefinedDictionary(getattr(a, large)).bytesList
    print(f"{small} is the first {len(x)} markers of {large}: {np.array_equal(x, y[:len(x)])}")
