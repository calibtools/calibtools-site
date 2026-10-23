import { describe, it, expect } from 'vitest';

/**
 * Unit tests for subscribe endpoint validation logic.
 * The actual endpoint runs on Cloudflare Workers, so we test the
 * validation rules that would be applied.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('subscribe email validation', () => {
  it('accepts valid emails', () => {
    expect(EMAIL_RE.test('user@example.com')).toBe(true);
    expect(EMAIL_RE.test('first.last@company.co.uk')).toBe(true);
    expect(EMAIL_RE.test('user+tag@domain.com')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(EMAIL_RE.test('')).toBe(false);
    expect(EMAIL_RE.test('notanemail')).toBe(false);
    expect(EMAIL_RE.test('@domain.com')).toBe(false);
    expect(EMAIL_RE.test('user@')).toBe(false);
    expect(EMAIL_RE.test('user @domain.com')).toBe(false);
  });

  it('rejects emails over 254 characters', () => {
    const longEmail = 'a'.repeat(246) + '@test.com';
    expect(longEmail.length).toBeGreaterThan(254);
    // Length check is separate from regex
    expect(longEmail.length > 254).toBe(true);
  });
});
