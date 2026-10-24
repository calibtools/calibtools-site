/**
 * Product image catalogue — build-time module.
 *
 * Reads src/assets/products/images.json and returns typed image entries
 * for a given product handle.  If a handle has no images in the catalogue,
 * callers fall back to the existing render pipeline (placeholder SVG).
 *
 * Validation runs at import time so a bad images.json breaks `astro build`
 * with a clear message.
 */

import catalogRaw from '@/assets/products/images.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Allowed values for the `kind` field. */
export type ImageKind = 'ai' | 'render' | 'photo';

const VALID_KINDS = new Set<string>(['ai', 'render', 'photo']);

export interface ProductImage {
  handle: string;
  file: string;
  kind: ImageKind;
  alt: string;
}

// ---------------------------------------------------------------------------
// Validation (runs once at import time)
// ---------------------------------------------------------------------------

const catalog: ProductImage[] = catalogRaw as ProductImage[];

function validateCatalog(): void {
  const errors: string[] = [];

  for (const entry of catalog) {
    // kind enum
    if (!VALID_KINDS.has(entry.kind)) {
      errors.push(
        `images.json: "${entry.handle}/${entry.file}" has invalid kind "${entry.kind}" (expected ai | render | photo)`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Product image catalogue validation failed:\n${errors.join('\n')}`,
    );
  }
}

validateCatalog();

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/** All catalogue images grouped by handle, preserving images.json order. */
const byHandle = new Map<string, ProductImage[]>();
for (const entry of catalog) {
  let list = byHandle.get(entry.handle);
  if (!list) {
    list = [];
    byHandle.set(entry.handle, list);
  }
  list.push(entry);
}

/**
 * Return product images for `handle` in images.json order.
 * Returns an empty array when the handle has no catalogue images
 * (caller should fall back to the render pipeline).
 */
export function getProductImages(handle: string): ProductImage[] {
  return byHandle.get(handle) ?? [];
}

/**
 * All handles that have at least one catalogue image.
 */
export function handlesWithImages(): string[] {
  return [...byHandle.keys()];
}

/** The full validated catalogue (for tests / build scripts). */
export { catalog as allProductImages };
