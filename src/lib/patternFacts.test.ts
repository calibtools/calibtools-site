import { describe, it, expect } from 'vitest';
import { patternFacts, patternFieldSize } from './patternFacts';
import { specFromLink, patternViewPath } from './patternLink';

const LINK = '/tools/generator/?type=ChArUco&rows=9&cols=12&square=60&marker=45&dict=DICT_5X5_1000&paper=A0&startId=0&scaleBar=true';

describe('read-only pattern page', () => {
  it('states the parameters of a ChArUco board as OpenCV counts them', () => {
    const facts = Object.fromEntries(patternFacts(specFromLink(LINK)!));
    expect(facts['Pattern ID']).toBe('P-YMS4V4');
    expect(facts['Squares (columns × rows)']).toBe('12 × 9');
    expect(facts['Marker IDs']).toBe('0 to 53 (54 markers)');
    expect(facts['Inner corners']).toBe('11 × 8 = 88');
    expect(facts['Pattern field']).toBe('720 × 540 mm');
    expect(patternFieldSize(specFromLink(LINK)!)).toEqual({ w: 720, h: 540 });
  });
  it('describes a checkerboard without marker rows', () => {
    const facts = Object.fromEntries(patternFacts(specFromLink('/tools/generator/?type=Checkerboard&rows=7&cols=10&square=25')!));
    expect(facts['Inner corners']).toBe('9 × 6 = 54');
    expect(facts['Dictionary']).toBeUndefined();
  });
  it('turns a generator link into the view link and leaves other links alone', () => {
    expect(patternViewPath(LINK)).toBe(LINK.replace('/tools/generator/', '/pattern/'));
    expect(patternViewPath('https://evil.example/x')).toBe('https://evil.example/x');
  });
});
