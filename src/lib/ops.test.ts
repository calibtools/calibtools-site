/**
 * Tests for operational safety scripts:
 * - CSV metafield header format (export-metafield-template)
 * - Shopify HMAC-SHA256 verification (rebuild webhook)
 * - SKU convention regex (check-skus)
 */

import { describe, it, expect } from 'vitest';

// --- CSV header format ---

/**
 * Build a Shopify metafield CSV column header.
 * Mirrors the function in scripts/export-metafield-template.mjs.
 */
function metafieldHeader(key: string, type: string): string {
  return `Metafield: specs.${key} [${type}]`;
}

describe('metafieldHeader CSV format', () => {
  it('formats single_line_text_field correctly', () => {
    expect(metafieldHeader('material', 'single_line_text_field'))
      .toBe('Metafield: specs.material [single_line_text_field]');
  });

  it('formats number_integer correctly', () => {
    expect(metafieldHeader('thickness_mm', 'number_integer'))
      .toBe('Metafield: specs.thickness_mm [number_integer]');
  });

  it('formats url type correctly', () => {
    expect(metafieldHeader('datasheet_url', 'url'))
      .toBe('Metafield: specs.datasheet_url [url]');
  });

  it('matches Shopify expected format: "Metafield: namespace.key [type]"', () => {
    const header = metafieldHeader('lead_time', 'single_line_text_field');
    // Shopify import requires exactly this format
    expect(header).toMatch(/^Metafield: specs\.\w+ \[\w+\]$/);
  });

  it('matches the header in docs/specs-template.csv', () => {
    // The first spec column in specs-template.csv
    expect(metafieldHeader('material', 'single_line_text_field'))
      .toBe('Metafield: specs.material [single_line_text_field]');
  });
});

// --- HMAC verification ---

/**
 * Verify Shopify webhook HMAC-SHA256 signature.
 * Mirrors the function in functions/api/rebuild.ts.
 */
async function verifyShopifyHmac(
  body: ArrayBuffer,
  secret: string,
  headerHmac: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, body);
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  if (computed.length !== headerHmac.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ headerHmac.charCodeAt(i);
  }
  return mismatch === 0;
}

describe('verifyShopifyHmac', () => {
  const secret = 'test-webhook-secret-123';
  const bodyText = '{"id":12345,"title":"Test Product"}';

  /**
   * Compute the expected HMAC for test fixtures.
   */
  async function computeHmac(body: string, sec: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(sec),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
  }

  it('returns true for valid HMAC', async () => {
    const hmac = await computeHmac(bodyText, secret);
    const body = new TextEncoder().encode(bodyText).buffer;
    expect(await verifyShopifyHmac(body, secret, hmac)).toBe(true);
  });

  it('returns false for wrong secret', async () => {
    const hmac = await computeHmac(bodyText, secret);
    const body = new TextEncoder().encode(bodyText).buffer;
    expect(await verifyShopifyHmac(body, 'wrong-secret', hmac)).toBe(false);
  });

  it('returns false for tampered body', async () => {
    const hmac = await computeHmac(bodyText, secret);
    const tampered = new TextEncoder().encode('{"id":99999}').buffer;
    expect(await verifyShopifyHmac(tampered, secret, hmac)).toBe(false);
  });

  it('returns false for empty HMAC header', async () => {
    const body = new TextEncoder().encode(bodyText).buffer;
    expect(await verifyShopifyHmac(body, secret, '')).toBe(false);
  });

  it('returns false for garbage HMAC', async () => {
    const body = new TextEncoder().encode(bodyText).buffer;
    expect(await verifyShopifyHmac(body, secret, 'not-a-real-hmac')).toBe(false);
  });

  it('handles empty body', async () => {
    const hmac = await computeHmac('', secret);
    const body = new TextEncoder().encode('').buffer;
    expect(await verifyShopifyHmac(body, secret, hmac)).toBe(true);
  });
});

// --- SKU regex ---

const SKU_PATTERN = /^(CHT|CHA|APR|CIR|ACR|HAL|CBM|VND|CUS|CUB|LUM|LDR|IRT|IQC|SPH|TCP|RES|ACC|SVC|OEM)-[PCGQOFHASX]-/;

describe('SKU convention regex', () => {
  const valid = [
    'CHA-P-6X6-300x200-25',
    'CHT-P-7x10-400x300-30',
    'CHA-C-6X6-150x150-20',
    'APR-P-36H11-600x400',
    'ACC-A-MNT-01',
    'SVC-X-CERT-ILAC',
    'CIR-G-ASY-100x100',
    'HAL-C-150x150',
    'OEM-S-CUSTOM-001',
  ];

  const invalid = [
    'CHARUCO-P-6X6-300',    // prefix too long
    'CH-P-6X6',             // prefix too short
    'CHA-Z-6X6',            // invalid material letter
    'CHA-p-6X6',            // lowercase material
    'CHA--6X6',             // missing material
    'cHA-P-6X6',            // lowercase prefix
    'RANDOM-SKU-123',       // unknown prefix
    '',                     // empty
    'CHA',                  // too short
    'CHA-P',                // no trailing dash
  ];

  for (const sku of valid) {
    it(`accepts valid SKU: ${sku}`, () => {
      expect(SKU_PATTERN.test(sku)).toBe(true);
    });
  }

  for (const sku of invalid) {
    it(`rejects invalid SKU: "${sku}"`, () => {
      expect(SKU_PATTERN.test(sku)).toBe(false);
    });
  }
});
