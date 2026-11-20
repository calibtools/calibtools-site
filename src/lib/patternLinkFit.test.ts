import { describe, it, expect } from 'vitest';
import { linkFitsItsPaper, smallestFittingPaper } from './patternLinkFit';

const big = (paper: string) => `/tools/generator/?type=ChArUco&rows=9&cols=12&square=60&marker=45&dict=DICT_5X5_1000&paper=${paper}&startId=0&scaleBar=true`;

describe('paper for a pattern link', () => {
  it('finds the smallest paper a 720 × 540 mm pattern prints on', () => {
    expect(smallestFittingPaper(big('A4'))).toBe('A0');
    expect(linkFitsItsPaper(big('A4'))).toBe(false);
    expect(linkFitsItsPaper(big('A1'))).toBe(false);
    expect(linkFitsItsPaper(big('A0'))).toBe(true);
  });
  it('accepts a small pattern on A4 and rejects what is not a generator link', () => {
    expect(linkFitsItsPaper('/tools/generator/?type=ChArUco&rows=7&cols=10&square=20&marker=15&dict=DICT_6X6_250&paper=A4&startId=0&scaleBar=true')).toBe(true);
    expect(smallestFittingPaper('https://evil.example/')).toBeNull();
  });
});
