import { describe, it, expect } from 'vitest';
import { openDisclosuresFor, idFromHash, type DisclosureNode } from './openForHash';

const node = (tagName: string, parentElement: DisclosureNode | null = null, open?: boolean): DisclosureNode => ({ tagName, parentElement, open });

describe('openDisclosuresFor', () => {
  it('opens a closed <details> that is the link target', () => {
    const d = node('DETAILS', node('MAIN'), false);
    expect(openDisclosuresFor(d)).toBe(1);
    expect(d.open).toBe(true);
  });

  it('opens every closed <details> around a target inside it', () => {
    const outer = node('DETAILS', node('MAIN'), false);
    const inner = node('DETAILS', node('DIV', outer), false);
    const answer = node('P', inner);
    expect(openDisclosuresFor(answer)).toBe(2);
    expect(outer.open).toBe(true);
    expect(inner.open).toBe(true);
  });

  it('leaves open sections and plain elements alone', () => {
    const d = node('DETAILS', null, true);
    expect(openDisclosuresFor(node('H2', d))).toBe(0);
    expect(openDisclosuresFor(node('H2', node('MAIN')))).toBe(0);
    expect(openDisclosuresFor(null)).toBe(0);
  });
});

describe('idFromHash', () => {
  it('reads and decodes the id', () => {
    expect(idFromHash('#faq')).toBe('faq');
    expect(idFromHash('#CT-CHA-P-400X300')).toBe('CT-CHA-P-400X300');
    expect(idFromHash('#what%20is')).toBe('what is');
  });

  it('returns null for an empty or malformed hash', () => {
    expect(idFromHash('')).toBeNull();
    expect(idFromHash('#')).toBeNull();
    expect(idFromHash('#%E0%A4%A')).toBeNull();
  });
});
