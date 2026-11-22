/**
 * Wait until `get()` returns a non-empty string, checking every `stepMs`, for at most `maxMs`.
 * Resolves with the value, or with '' when the time is up. Used by forms whose human check
 * answers in the background a moment after the page loads.
 */
export function waitForValue(get: () => string, maxMs: number, stepMs = 150): Promise<string> {
  return new Promise((resolve) => {
    const first = get();
    if (first) { resolve(first); return; }
    const started = Date.now();
    const timer = setInterval(() => {
      const v = get();
      if (v || Date.now() - started >= maxMs) { clearInterval(timer); resolve(v); }
    }, stepMs);
  });
}
