import numpy as np, cv2
from lab import *
rng = np.random.default_rng(3)
b1 = board(0); b2 = board(0)
cases = {"full": 170, "part": 520}
for name, x2 in cases.items():
    r1, t1 = look_at((-170 if name=="full" else -150, 0, 1000), 1000, 15, np.random.default_rng(5)); r2, t2 = look_at((x2, 0, 1000), 1000, 15, np.random.default_rng(6))
    img = render([(b1, r1, t1), (b2, r2, t2)], rng)
    cv2.imwrite(f"case_{name}.png", img); np.savez(f"case_{name}.npz", T1=truth(b1, r1, t1), T2=truth(b2, r2, t2))
