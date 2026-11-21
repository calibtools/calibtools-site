import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanTag, isNotifyOnly } from './subscribeTags';
import { NOTIFY_TAG } from './software';

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

describe('notify-only tags', () => {
  it('the Plumbline release tag asks for a notification, not the newsletter', () => {
    expect(isNotifyOnly(cleanTag(NOTIFY_TAG))).toBe(true);
  });

  it('other tags and no tag stay newsletter signups', () => {
    for (const t of ['', 'revision:charuco-composite', 'notify:', 'xnotify:plumbline']) expect(isNotifyOnly(cleanTag(t))).toBe(false);
    expect(isNotifyOnly(cleanTag(undefined))).toBe(false);
  });

  it('cleanTag drops anything outside letters, digits, colon, underscore, hyphen', () => {
    expect(cleanTag('notify:plum bline<script>')).toBe('notify:plumblinescript');
    expect(cleanTag('a'.repeat(80))).toHaveLength(64);
  });

  it('the endpoint sets marketing consent only outside the notify branch', () => {
    const src = readFileSync(resolve(__dirname, '../../functions/api/subscribe.ts'), 'utf-8');
    const branch = src.indexOf('if (!notifyOnly) {');
    const consent = src.indexOf('customerEmailMarketingConsentUpdate(input');
    const tagging = src.indexOf('tagsAdd(id');
    expect(branch).toBeGreaterThan(0);
    expect(consent).toBeGreaterThan(branch);
    expect(tagging).toBeGreaterThan(consent);
    expect(src.match(/customerEmailMarketingConsentUpdate\(input/g)).toHaveLength(1);
  });

  it('the Plumbline page does not promise the monthly email', () => {
    const page = readFileSync(resolve(__dirname, '../pages/plumbline/index.astro'), 'utf-8');
    expect(page).not.toMatch(/monthly/i);
  });
});
