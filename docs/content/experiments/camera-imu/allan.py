"""Allan deviation of a simulated gyro standing still: can the two noise numbers Kalibr asks for be read back, and how long
does the recording have to be? Run: python allan.py   (about 2 minutes)"""
import json, numpy as np
RATE = 200.0
N_TRUE, K_TRUE = 1.87e-4, 2.66e-5        # gyroscope_noise_density rad/s/sqrt(Hz), gyroscope_random_walk rad/s^2/sqrt(Hz)

def simulate(hours, rng):
    n = int(hours * 3600 * RATE)
    return rng.normal(0, N_TRUE * np.sqrt(RATE), n) + np.cumsum(rng.normal(0, K_TRUE / np.sqrt(RATE), n))

def allan_deviation(x, taus):
    """Overlapping Allan deviation of rate samples x at the averaging times taus (seconds)."""
    theta = np.concatenate([[0.0], np.cumsum(x)]) / RATE; out = []
    for tau in taus:
        m = int(round(tau * RATE)); d = theta[2 * m:] - 2 * theta[m:-m] + theta[:-2 * m]
        out.append(np.sqrt(np.mean(d * d) / (2 * tau * tau)))
    return np.array(out)

def read_off(x, hours):
    """The two readings of the Kalibr wiki: white noise at tau = 1 s; random walk where the fitted +1/2 slope crosses tau = 3 s.
    The slope is fitted by weighted least squares to sigma^2 = N^2/tau + K^2 tau/3 over averaging times up to a tenth of the recording."""
    taus = np.unique(np.round(np.logspace(-1, np.log10(hours * 3600 / 10), 40), 2)); ad = allan_deviation(x, taus)
    A = np.stack([1 / taus, taus / 3], 1); w = np.sqrt(hours * 3600 / taus) / ad ** 2   # relative errors; long averaging times have few samples
    n2, k2 = np.linalg.lstsq(A * w[:, None], ad ** 2 * w, rcond=None)[0]
    at3 = float(allan_deviation(x, [3.0])[0])
    return float(allan_deviation(x, [1.0])[0]), float(np.sqrt(max(k2, 0))), at3

if __name__ == "__main__":
    rows = []
    for hours in (0.1, 0.25, 0.5, 1, 2, 5):
        res = np.array([read_off(simulate(hours, np.random.default_rng([int(hours * 100), s])), hours) for s in range(40)])
        rows.append(dict(hours=hours, runs=40, noise_density=res[:, 0].tolist(), random_walk=res[:, 1].tolist(), curve_at_3s=res[:, 2].tolist()))
        print(hours, "h  N", np.median(res[:, 0]) / N_TRUE, " K median", np.median(res[:, 1]) / K_TRUE, " K within 20 %:", int((np.abs(res[:, 1] / K_TRUE - 1) < 0.2).sum()), "of 40", " curve at 3 s / K", np.median(res[:, 2]) / K_TRUE, flush=True)
    json.dump(dict(rate_hz=RATE, noise_density_true=N_TRUE, random_walk_true=K_TRUE, rows=rows), open("results/allan.json", "w"))
