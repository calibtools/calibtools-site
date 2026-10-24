/**
 * Eagerly import all product PNGs via Vite glob so Astro's image pipeline
 * can process them.  The glob is static — Vite needs it at compile time.
 *
 * Usage:  getImageMetadata('charuco-composite', '01-hero.webp')
 */

import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/products/**/*.webp',
  { eager: true },
);

/**
 * Resolve an image import by handle + filename.
 * Returns `undefined` when the path doesn't match any import.
 */
export function getImageMetadata(
  handle: string,
  file: string,
): ImageMetadata | undefined {
  const key = `/src/assets/products/${handle}/${file}`;
  return modules[key]?.default;
}
