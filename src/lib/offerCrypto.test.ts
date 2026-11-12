import { describe, it, expect } from 'vitest';
import { decryptOffer, encryptOffer, isOfferId, isOfferKey, newOfferId } from './offerCrypto';

describe('offer encryption', () => {
  it('round-trips text, including non-ASCII', async () => {
    const text = JSON.stringify({ no: 'Q-1', spec: '±2 µm · 14 × 11' });
    const { payload, key } = await encryptOffer(text);
    expect(isOfferKey(key)).toBe(true);
    expect(payload.startsWith('v1.')).toBe(true);
    expect(payload).not.toContain('Q-1');
    expect(await decryptOffer(payload, key)).toBe(text);
  });
  it('uses a fresh key and nonce every time', async () => {
    const a = await encryptOffer('same');
    const b = await encryptOffer('same');
    expect(a.key).not.toBe(b.key);
    expect(a.payload).not.toBe(b.payload);
  });
  it('gives null for a wrong key, an altered payload or a malformed one', async () => {
    const { payload, key } = await encryptOffer('secret');
    const other = (await encryptOffer('x')).key;
    expect(await decryptOffer(payload, other)).toBeNull();
    const parts = payload.split('.');
    const flipped = parts[2][0] === 'A' ? 'B' + parts[2].slice(1) : 'A' + parts[2].slice(1);
    expect(await decryptOffer(`${parts[0]}.${parts[1]}.${flipped}`, key)).toBeNull();
    expect(await decryptOffer('v2.a.b', key)).toBeNull();
    expect(await decryptOffer('probe', key)).toBeNull();
    expect(await decryptOffer(payload, 'short')).toBeNull();
  });
  it('makes ids that pass its own check', () => {
    const id = newOfferId();
    expect(id).toHaveLength(24);
    expect(isOfferId(id)).toBe(true);
    expect(newOfferId()).not.toBe(id);
    for (const bad of ['', 'short', 'UPPERCASEUPPERCASEUP', 'has-dash-has-dash-has', '../../etc/passwd/aaaa']) expect(isOfferId(bad), bad).toBe(false);
  });
});
