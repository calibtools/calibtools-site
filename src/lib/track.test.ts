import { describe, it, expect, vi, afterEach } from 'vitest';
import { track, cleanParams } from './track';

afterEach(() => vi.unstubAllGlobals());

describe('track', () => {
  it('does nothing without gtag (no consent, no tag, or on the server)', () => {
    expect(() => track('generate_lead', { material: 'Aluminum composite' })).not.toThrow();
    vi.stubGlobal('window', {});
    expect(() => track('add_to_cart', { quantity: 1 })).not.toThrow();
  });
  it('sends the event when gtag is there', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', { gtag });
    track('file_download', { file_extension: 'pdf', pattern_type: 'ChArUco' });
    expect(gtag).toHaveBeenCalledWith('event', 'file_download', { file_extension: 'pdf', pattern_type: 'ChArUco' });
  });
  it('sends the Plumbline download event with platform, file and version', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', { gtag });
    track('plumbline_download', { platform: 'macOS', file_name: 'Plumbline-0.1.0-beta.1-macos-arm64.dmg', version: '0.1.0 beta 1' });
    expect(gtag).toHaveBeenCalledWith('event', 'plumbline_download', { platform: 'macOS', file_name: 'Plumbline-0.1.0-beta.1-macos-arm64.dmg', version: '0.1.0 beta 1' });
  });
  it('never throws into the page', () => {
    vi.stubGlobal('window', { gtag: () => { throw new Error('blocked'); } });
    expect(() => track('add_to_cart')).not.toThrow();
  });
  it('keeps short plain values only: no email addresses, no long text, no objects', () => {
    expect(cleanParams({ a: 'ok', n: 3, b: true, email: 'ada@lab.example', long: 'x'.repeat(101), o: { x: 1 } as never, u: undefined })).toEqual({ a: 'ok', n: 3, b: true });
  });
});
