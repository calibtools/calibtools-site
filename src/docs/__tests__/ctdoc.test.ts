import { describe, it, expect } from 'vitest';
import {
  esc,
  status,
  section,
  num,
  table,
  kv,
  result_box,
  checkbox,
  p,
  note,
  code,
  CONTENT_W,
  A4_BODY_H,
  LETTER_ZOOM,
  PAPER,
} from '../ctdoc';

// ----------------------------------------------------------------- esc
describe('esc', () => {
  it('escapes HTML special characters', () => {
    expect(esc('<script>"a&b"</script>')).toBe(
      '&lt;script&gt;&quot;a&amp;b&quot;&lt;/script&gt;',
    );
  });

  it('escapes single quotes', () => {
    expect(esc("it's")).toBe('it&#x27;s');
  });

  it('converts numbers to string', () => {
    expect(esc(42)).toBe('42');
  });
});

// ----------------------------------------------------------------- status
describe('status', () => {
  it('renders PASS', () => {
    const html = status('PASS');
    expect(html).toContain('class="st pass"');
    expect(html).toContain('PASS');
    expect(html).not.toContain('<svg');
  });

  it('renders FAIL with crossed-box SVG', () => {
    const html = status('FAIL');
    expect(html).toContain('class="st fail"');
    expect(html).toContain('<svg');
    expect(html).toContain('FAIL');
  });

  it('renders PENDING', () => {
    const html = status('PENDING');
    expect(html).toContain('class="st pending"');
  });

  it('renders N/A', () => {
    const html = status('N/A');
    expect(html).toContain('class="st na"');
  });

  it('is case-insensitive', () => {
    const html = status('pass');
    expect(html).toContain('class="st pass"');
    expect(html).toContain('PASS');
  });
});

// ----------------------------------------------------------------- section
describe('section', () => {
  it('renders numbered heading', () => {
    const html = section(1, 'Method');
    expect(html).toContain('<h2 class="sec">');
    expect(html).toContain('<span class="n">1</span>');
    expect(html).toContain('<span>Method</span>');
  });

  it('renders without number when null', () => {
    const html = section(null, 'Appendix');
    expect(html).not.toContain('class="n"');
    expect(html).toContain('<span>Appendix</span>');
  });

  it('renders aside', () => {
    const html = section(2, 'Results', 'ISO 17025');
    expect(html).toContain('<span class="aside">ISO 17025</span>');
  });
});

// ----------------------------------------------------------------- num
describe('num', () => {
  it('returns em dash for null', () => {
    expect(num(null)).toBe('\u2014');
  });

  it('returns em dash for undefined', () => {
    expect(num(undefined)).toBe('\u2014');
  });

  it('formats with decimal places', () => {
    expect(num(3.14159, 2)).toBe('3.14');
  });

  it('uses true minus sign U+2212', () => {
    const s = num(-1.5, 1);
    expect(s).toBe('\u22121.5');
    expect(s).not.toContain('-');
  });

  it('shows plus sign when sign=true', () => {
    expect(num(2.0, 1, true)).toBe('+2.0');
  });

  it('avoids negative zero', () => {
    // -0.004 rounded to 2 decimal places = 0.00, not -0.00
    const s = num(-0.004, 2);
    expect(s).toBe('0.00');
  });

  it('appends unit', () => {
    expect(num(5.0, 1, false, 'mm')).toBe('5.0 mm');
  });

  it('formats integer without nd', () => {
    expect(num(42)).toBe('42');
  });
});

// ----------------------------------------------------------------- table
describe('table', () => {
  it('renders basic table with column types', () => {
    const cols: [string, 't' | 'm' | 'n' | 'c' | 's'][] = [
      ['Name', 't'],
      ['Value (mm)', 'n'],
      ['Status', 's'],
    ];
    const rows = [
      ['Point 1', '0.05', 'PASS'],
      ['Point 2', '0.12', 'FAIL'],
    ];
    const html = table(cols, rows);
    expect(html).toContain('<table class="t ');
    expect(html).toContain('<span class="nu">(mm)</span>');
    expect(html).toContain('class="st pass"');
    expect(html).toContain('class="st fail"');
    expect(html).toContain('<td class="n">0.05</td>');
  });

  it('renders footer', () => {
    const cols: [string, 't' | 'n'][] = [
      ['Item', 't'],
      ['Total', 'n'],
    ];
    const html = table(cols, [['A', '10']], '', ['Sum', '10']);
    expect(html).toContain('<tfoot>');
    expect(html).toContain('Sum');
  });

  it('applies widths', () => {
    const cols: [string, 't'][] = [['X', 't']];
    const html = table(cols, [['a']], '', null, ['50%']);
    expect(html).toContain('<col style="width:50%">');
  });

  it('handles non-status values in s column', () => {
    const cols: [string, 's'][] = [['Result', 's']];
    const html = table(cols, [['custom text']]);
    // Should not wrap in status span
    expect(html).not.toContain('class="st');
    expect(html).toContain('custom text');
  });
});

// ----------------------------------------------------------------- kv
describe('kv', () => {
  it('renders key-value pairs', () => {
    const html = kv([
      ['Serial', '000311'],
      ['Date', '2026-01-01'],
    ]);
    expect(html).toContain('<dl class="kv"');
    expect(html).toContain('<dt>Serial</dt>');
    expect(html).toContain('<dd class="">000311</dd>');
  });

  it('applies mono class for mono_keys', () => {
    const html = kv(
      [['Serial', '000311']],
      ['Serial'],
    );
    expect(html).toContain('<dd class="m">000311</dd>');
  });
});

// ----------------------------------------------------------------- result_box
describe('result_box', () => {
  it('renders PASS result', () => {
    const html = result_box('PASS', 'All within tolerance.');
    expect(html).toContain('class="result pass"');
    expect(html).toContain('PASS');
    expect(html).toContain('All within tolerance.');
    expect(html).toContain('Overall result');
  });

  it('renders FAIL with inverted SVG', () => {
    const html = result_box('FAIL', 'Out of tolerance.');
    expect(html).toContain('class="result fail"');
    expect(html).toContain('<svg');
    expect(html).toContain('#fff'); // white stroke for fail
  });

  it('renders PENDING with dashed border (via CSS class)', () => {
    const html = result_box('PENDING', 'Awaiting review.');
    expect(html).toContain('class="result pending"');
  });

  it('renders strip layout', () => {
    const html = result_box('PASS', 'OK', 'Result', true, 'Rev A');
    expect(html).toContain('class="result strip pass"');
    expect(html).toContain('class="meta"');
    expect(html).toContain('Rev A');
  });

  it('uses custom label', () => {
    const html = result_box('PASS', 'OK', 'Inspection result');
    expect(html).toContain('Inspection result');
  });
});

// ----------------------------------------------------------------- checkbox
describe('checkbox', () => {
  it('renders checked', () => {
    const html = checkbox(true, 'Agree');
    expect(html).toContain('class="check on"');
    expect(html).toContain('Agree');
  });

  it('renders unchecked', () => {
    const html = checkbox(false, 'Disagree');
    expect(html).toContain('class="check "');
    expect(html).not.toContain('on');
  });
});

// ----------------------------------------------------------------- constants
describe('constants', () => {
  it('A4 body height is 260 mm', () => {
    expect(A4_BODY_H).toBeCloseTo(260.0, 1);
  });

  it('CONTENT_W is 178 mm', () => {
    expect(CONTENT_W).toBe(178.0);
  });

  it('LETTER_ZOOM is approximately 0.9323', () => {
    expect(LETTER_ZOOM).toBeCloseTo(0.9323, 3);
  });

  it('A4 paper is 210x297', () => {
    expect(PAPER.A4).toEqual([210.0, 297.0]);
  });
});

// ----------------------------------------------------------------- other helpers
describe('p', () => {
  it('renders paragraph', () => {
    expect(p('Hello')).toBe('<p class="">Hello</p>');
  });

  it('renders with class', () => {
    expect(p('Hello', 'small')).toBe('<p class="small">Hello</p>');
  });
});

describe('note', () => {
  it('renders note block', () => {
    const html = note('Important info');
    expect(html).toContain('class="note"');
    expect(html).toContain('class="lab"');
    expect(html).toContain('Note');
    expect(html).toContain('Important info');
  });

  it('renders custom label', () => {
    const html = note('Info', 'Warning');
    expect(html).toContain('Warning');
  });
});

describe('code', () => {
  it('renders code block with comment highlighting', () => {
    const html = code('# comment\ncode line');
    expect(html).toContain('<pre class="code">');
    expect(html).toContain('<span class="c">');
    expect(html).toContain('# comment');
    expect(html).toContain('code line');
  });

  it('highlights // comments', () => {
    const html = code('// js comment\nvar x = 1;');
    expect(html).toContain('<span class="c">');
  });
});
