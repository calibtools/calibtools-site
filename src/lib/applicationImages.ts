/**
 * Photo at the top of each application page.
 * Files: src/assets/applications/<slug>.webp; alt text: images.json beside them.
 * A page without a file simply shows no photo.
 */
import type { ImageMetadata } from 'astro';
import alts from '@/assets/applications/images.json';

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/applications/*.webp',
  { eager: true },
);

export const applicationImageAlts: Record<string, string> = alts;

export function applicationImage(
  slug: string,
): { src: ImageMetadata; alt: string } | undefined {
  const src = modules[`/src/assets/applications/${slug}.webp`]?.default;
  const alt = applicationImageAlts[slug];
  return src && alt ? { src, alt } : undefined;
}
