import { describe, it, expect, vi } from 'vitest';
import { waitForValue } from './waitFor';

describe('waitForValue', () => {
  it('returns at once when the value is already there', async () => {
    expect(await waitForValue(() => 'tok', 5000)).toBe('tok');
  });

  it('returns the value as soon as it appears', async () => {
    vi.useFakeTimers();
    let v = '';
    const p = waitForValue(() => v, 5000, 100);
    await vi.advanceTimersByTimeAsync(250);
    v = 'tok';
    await vi.advanceTimersByTimeAsync(100);
    expect(await p).toBe('tok');
    vi.useRealTimers();
  });

  it('gives up with an empty string after the time limit', async () => {
    vi.useFakeTimers();
    const p = waitForValue(() => '', 1000, 100);
    await vi.advanceTimersByTimeAsync(1100);
    expect(await p).toBe('');
    vi.useRealTimers();
  });
});
