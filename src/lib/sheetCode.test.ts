import { describe, it, expect } from 'vitest';
import { sheetCode } from './sheetCode';

describe('sheetCode', () => {
  it('names the home page', () => expect(sheetCode('/')).toBe('CT-WEB-HOME'));
  it('builds the code from the path', () => {
    expect(sheetCode('/targets/charuco-composite/')).toBe('CT-WEB-TARGETS-CHARUCO-COMPOSITE');
    expect(sheetCode('/tools/generator')).toBe('CT-WEB-TOOLS-GENERATOR');
  });
  it('keeps to letters, digits and dashes and a bounded length', () => {
    expect(sheetCode('/guides/usaf-1951-lp-mm-table/')).toBe('CT-WEB-GUIDES-USAF-1951-LP-MM-TABLE');
    expect(sheetCode('/a/' + 'x'.repeat(80) + '/')).toMatch(/^CT-WEB-[A-Z0-9-]{1,41}$/);
  });
});
