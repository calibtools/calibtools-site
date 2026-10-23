import { describe, it, expect } from 'vitest';
import { buildReadme } from './exportZip';

describe('buildReadme', () => {
  const files = [
    { name: 'pattern.pdf', desc: 'PDF pattern (1:1 mm scale)' },
    { name: 'pattern.svg', desc: 'SVG pattern' },
    { name: 'pattern.png', desc: 'PNG pattern (300 dpi)' },
  ];

  it('contains brand line with calib.tools', () => {
    const readme = buildReadme({ summary: 'ChArUco 7×10', files });
    expect(readme).toContain('calib.tools');
    expect(readme).toContain('generated');
  });

  it('lists all files with descriptions', () => {
    const readme = buildReadme({ summary: 'ChArUco 7×10', files });
    expect(readme).toContain('pattern.pdf');
    expect(readme).toContain('PDF pattern (1:1 mm scale)');
    expect(readme).toContain('pattern.svg');
    expect(readme).toContain('pattern.png');
  });

  it('contains licence sentence with Geist font credit', () => {
    const readme = buildReadme({ summary: 'ChArUco 7×10', files });
    expect(readme).toContain('free to use');
    expect(readme).toContain('Geist fonts © Vercel, SIL OFL 1.1');
  });

  it('contains link to targets page', () => {
    const readme = buildReadme({ summary: 'ChArUco 7×10', files });
    expect(readme).toContain('calib.tools/targets');
  });
});
