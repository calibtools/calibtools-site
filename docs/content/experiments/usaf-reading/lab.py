"""A USAF 1951 element seen by a camera, in one dimension across the bars.

Scene: three dark bars of width w on a bright ground, spaces as wide as the bars (lengths in pixels).
Camera: Gaussian lens blur, square pixels with 100 % fill, sampled at a random position against the bars, noise added.
Each bar is 5 w long; the observer averages the rows in the middle 60 % of that length.

The observer counts dark bars: a dip counts when it stands out from both neighbours by at least `threshold`
of the chart's black-to-white difference. An element is resolved when exactly three bars are counted."""
import numpy as np
from scipy.signal import find_peaks

SUB = 64                                   # scene samples per pixel
STEP = 2 ** (1 / 6)                        # frequency ratio from one element to the next
# elements by frequency in cycles per pixel; Nyquist is 0.5. Index 0 is the coarsest.
FREQS = 0.5 * STEP ** np.arange(-15, 7)    # 0.088 ... 1.0 cycles/pixel, element 15 is exactly Nyquist
NYQUIST_INDEX = 15

def system_mtf(f, blur):
    """Lens blur (Gaussian, sigma in pixels) times the pixel aperture, at f cycles per pixel."""
    return np.exp(-2 * np.pi ** 2 * blur ** 2 * f ** 2) * np.abs(np.sinc(f))

def profile(f, blur, phase, chart_contrast=1.0):
    """Pixel values across one element at f cycles/pixel. Bright ground = 1, bars = 1 - chart_contrast."""
    w = 0.5 / f                                            # bar width in pixels
    margin = int(np.ceil(3 * w + 4 * blur + 3))
    n = int(np.ceil(5 * w)) + 2 * margin                   # pixels
    x = (np.arange(n * SUB) + 0.5) / SUB - margin - phase  # scene coordinate, 0 = left edge of the first bar
    scene = np.ones_like(x)
    for k in range(3):
        scene[(x >= 2 * k * w) & (x < (2 * k + 1) * w)] = 1 - chart_contrast
    if blur > 0:
        half = int(np.ceil(4 * blur * SUB))
        g = np.exp(-0.5 * (np.arange(-half, half + 1) / (blur * SUB)) ** 2); g /= g.sum()
        scene = np.convolve(np.pad(scene, half, mode="edge"), g, mode="valid")
    return scene.reshape(n, SUB).mean(axis=1), margin, w

def bars_counted(f, blur, rng, threshold=0.1, noise=0.0, chart_contrast=1.0):
    """How many dark bars the observer counts in one look at one element."""
    p, margin, w = profile(f, blur, rng.uniform(0, 1), chart_contrast)
    rows = max(1, int(round(3 * w)))                       # the middle 60 % of bars 5 w long
    if noise > 0:
        p = p + rng.normal(0, noise, (rows, len(p))).mean(axis=0)
    lo, hi = margin - int(np.ceil(w)) - 1, margin + int(np.ceil(5 * w)) + int(np.ceil(w)) + 1
    dips, _ = find_peaks(-p[lo:hi], prominence=threshold * chart_contrast)
    return len(dips)

def one_look(blur, rng, **kw):
    """One look at the whole chart: bars counted in every element, each at its own position on the sensor."""
    return np.array([bars_counted(f, blur, rng, **kw) for f in FREQS])

def reading(counts):
    """Index of the finest element reached by going from coarse to fine and stopping at the first element
    that does not show three bars. -1 if the coarsest already fails."""
    bad = np.where(counts != 3)[0]
    return (bad[0] if len(bad) else len(counts)) - 1
