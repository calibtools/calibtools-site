/**
 * Menu-aim: determines whether the pointer is moving toward an open panel.
 *
 * Pure function — no DOM, no timers, no side effects.
 * If the pointer's velocity vector intersects the panel rectangle,
 * the menu should stay open (user is aiming for it).
 */

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }

/**
 * Returns true if the line from `prev` through `curr` (extended forward)
 * intersects `panelRect`. This means the user is likely aiming at the panel.
 */
export function shouldKeepOpen(prev: Point, curr: Point, panelRect: Rect): boolean {
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;

  // No movement — can't determine aim
  if (dx === 0 && dy === 0) return false;

  // Panel edges
  const left = panelRect.x;
  const right = panelRect.x + panelRect.width;
  const top = panelRect.y;
  const bottom = panelRect.y + panelRect.height;

  // Check ray from curr in direction (dx, dy) against the four edges of the rect.
  // We need the ray to hit the rect at t >= 0 (forward direction).
  let tMin = 0;
  let tMax = Infinity;

  // X-axis slab
  if (dx !== 0) {
    const t1 = (left - curr.x) / dx;
    const t2 = (right - curr.x) / dx;
    const tEnter = Math.min(t1, t2);
    const tExit = Math.max(t1, t2);
    tMin = Math.max(tMin, tEnter);
    tMax = Math.min(tMax, tExit);
  } else {
    // Ray is vertical — must be within x bounds
    if (curr.x < left || curr.x > right) return false;
  }

  // Y-axis slab
  if (dy !== 0) {
    const t1 = (top - curr.y) / dy;
    const t2 = (bottom - curr.y) / dy;
    const tEnter = Math.min(t1, t2);
    const tExit = Math.max(t1, t2);
    tMin = Math.max(tMin, tEnter);
    tMax = Math.min(tMax, tExit);
  } else {
    if (curr.y < top || curr.y > bottom) return false;
  }

  return tMax >= tMin && tMax >= 0;
}
