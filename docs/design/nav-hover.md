# Nav Mega-Menu Hover Measurement

**Date:** 2026-10-28  
**Viewport:** 1440 × 900

## Gap between trigger bottom edge and panel top edge

| Trigger  | Trigger bottom | Panel top | Gap  |
|----------|---------------|-----------|------|
| Targets  | 51 px         | 55 px     | 4 px |
| Tools    | 51 px         | 55 px     | 4 px |
| Support  | 51 px         | 55 px     | 4 px |

Gap comes from `mt-1` (4 px margin-top) on `[data-nav-panel]`.

## Current close delay

**0 ms** — `mouseleave` on `[data-nav-disclosure]` calls `closePanel()` synchronously (Nav.astro line 319).

## Diagonal path: does "Targets → far-right column" cross "Tools" trigger?

No. The diagonal from Targets trigger center to the far-right column of the Targets panel passes at y=66 px, which is below the Tools trigger (y=14–51 px). The panel sits below the trigger row, so the diagonal goes downward and to the right, missing the Tools trigger.

## Hover path results (before fix)

| Path | Description | Menu kept? |
|------|-------------|-----------|
| (i)  | Straight down from trigger into panel center (~40 steps, ~300 ms) | **NO** — menu closes when mouse exits trigger before entering panel (4 px gap) |
| (ii) | Diagonal from trigger to far-right column of panel (~40 steps, ~300 ms) | **NO** — same gap problem; mouse exits disclosure wrapper |
| (iii)| Exit 50 px sideways, return within 100 ms (< 150 ms) | YES — mouseenter re-fires on return |

## Hover path results (after fix)

| Path | Description | Menu kept? |
|------|-------------|-----------|
| (i)  | Straight down from trigger into panel center (~40 steps, ~300 ms) | **YES** |
| (ii) | Diagonal from trigger to far-right column of panel (~40 steps, ~300 ms) | **YES** |
| (iii)| Exit 50 px sideways, return within 100 ms (< 150 ms) | **YES** |
| (iv) | Slow drift 6 px outside panel bottom for 100 ms, then return | **YES** |

Gap after fix: **0 px** (panel hit-area is contiguous with trigger via `pt-1` bridge on the outer wrapper).

## Fix summary

1. **Bridge element:** Panel outer wrapper uses `pt-1` padding instead of `mt-1` margin, making the hit area contiguous with the trigger. Visual styles (border, bg, shadow, rounded) moved to an inner div.
2. **220 ms close timer:** `pointerleave` on the disclosure starts a 220 ms timer; re-entering cancels it.
3. **120 ms intent delay:** Switching to another trigger while one is open waits 120 ms to confirm intent.
4. **Menu-aim:** `shouldKeepOpen(prev, curr, panelRect)` ray-casts the pointer velocity vector against the panel rect. If the user is aiming at the open panel, the switch is suppressed.
5. **`(hover: none)` guard:** All pointer-hover handlers are gated behind `matchMedia('(hover: hover)')`. Click and keyboard behaviour unchanged.

## Root causes

1. **4 px dead zone** between trigger and panel. The `[data-nav-disclosure]` wrapper's bottom edge is flush with the trigger button, but the panel floats 4 px below via `mt-1`. Moving downward into the panel means leaving the disclosure wrapper for 4 px.
2. **0 ms close delay.** Any exit from the disclosure wrapper instantly hides the panel, even if the pointer is heading straight for it.
3. **No menu-aim.** Switching triggers is instant on mouseenter, so a diagonal move toward a panel can accidentally activate a neighbouring trigger.
