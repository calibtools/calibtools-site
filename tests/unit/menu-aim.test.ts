import { describe, it, expect } from 'vitest';
import { shouldKeepOpen, type Point, type Rect } from '../../src/lib/menu-aim';

const panel: Rect = { x: 400, y: 60, width: 660, height: 300 };

describe('shouldKeepOpen', () => {
  it('returns true when moving straight down toward the panel', () => {
    const prev: Point = { x: 500, y: 30 };
    const curr: Point = { x: 500, y: 40 };
    expect(shouldKeepOpen(prev, curr, panel)).toBe(true);
  });

  it('returns true when moving diagonally toward the panel', () => {
    const prev: Point = { x: 450, y: 30 };
    const curr: Point = { x: 700, y: 50 };
    expect(shouldKeepOpen(prev, curr, panel)).toBe(true);
  });

  it('returns false when moving away from the panel (upward)', () => {
    const prev: Point = { x: 500, y: 50 };
    const curr: Point = { x: 500, y: 40 };
    expect(shouldKeepOpen(prev, curr, panel)).toBe(false);
  });

  it('returns false when moving horizontally past the panel', () => {
    const prev: Point = { x: 100, y: 30 };
    const curr: Point = { x: 200, y: 30 };
    expect(shouldKeepOpen(prev, curr, panel)).toBe(false);
  });

  it('returns false when stationary (no movement)', () => {
    const prev: Point = { x: 500, y: 40 };
    const curr: Point = { x: 500, y: 40 };
    expect(shouldKeepOpen(prev, curr, panel)).toBe(false);
  });

  it('returns true when moving toward left edge of panel from the left', () => {
    const prev: Point = { x: 350, y: 50 };
    const curr: Point = { x: 380, y: 55 };
    expect(shouldKeepOpen(prev, curr, panel)).toBe(true);
  });

  it('returns false when moving away from panel to the left', () => {
    const prev: Point = { x: 380, y: 55 };
    const curr: Point = { x: 350, y: 50 };
    expect(shouldKeepOpen(prev, curr, panel)).toBe(false);
  });

  it('returns true when cursor is already inside the panel rect', () => {
    const prev: Point = { x: 500, y: 100 };
    const curr: Point = { x: 510, y: 110 };
    expect(shouldKeepOpen(prev, curr, panel)).toBe(true);
  });

  it('returns false when moving vertically but outside x range', () => {
    const prev: Point = { x: 100, y: 30 };
    const curr: Point = { x: 100, y: 50 };
    // x=100 is left of panel (x=400), moving straight down won't hit it
    expect(shouldKeepOpen(prev, curr, panel)).toBe(false);
  });
});
