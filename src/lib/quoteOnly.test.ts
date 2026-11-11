import { describe, it, expect } from 'vitest';
import { QUOTE_ONLY_HANDLES, LAYOUT_ON_ORDER_HANDLES } from './constants';

describe('quote-only products', () => {
  it('the HALCON plate is ordered through a quote, because its mark layout is agreed first', () => {
    expect(LAYOUT_ON_ORDER_HANDLES).toContain('halcon-composite');
    for (const h of LAYOUT_ON_ORDER_HANDLES) expect(QUOTE_ONLY_HANDLES).toContain(h);
  });
  it('boards with a fixed catalog layout stay in the cart', () => {
    for (const h of ['charuco-composite', 'checkerboard-composite', 'aprilgrid-composite', 'circlegrid-composite', 'charuco-ceramic']) {
      expect(QUOTE_ONLY_HANDLES).not.toContain(h);
    }
  });
});
