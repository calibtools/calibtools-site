/**
 * Build-time helper: generate optimised image variants for a product image.
 *
 * Called from .astro page frontmatter.  Uses Astro's `getImage()` to produce
 * AVIF, WebP and JPEG at the specified widths.  Returns a structure the React
 * ImageGallery island can render as `<picture>` elements.
 */

import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

export const IMAGE_WIDTHS = [480, 800, 1200, 1600, 2304] as const;

export interface OptimizedSource {
  type: string;      // e.g. "image/avif"
  srcset: string;    // "url 480w, url 800w, ..."
}

export interface OptimizedImage {
  /** Optimised <source> elements (avif, webp). */
  sources: OptimizedSource[];
  /** Fallback <img> src (JPEG at largest width). */
  src: string;
  /** Responsive srcset for the fallback <img> (JPEG). */
  srcset: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * Generate optimised variants of a single image.
 *
 * @param image  Astro ImageMetadata (from a static import)
 * @param alt    Alt text
 */
export async function optimizeProductImage(
  image: ImageMetadata,
  alt: string,
): Promise<OptimizedImage> {
  const formats: Array<{ format: 'avif' | 'webp' | 'jpeg'; mime: string }> = [
    { format: 'avif', mime: 'image/avif' },
    { format: 'webp', mime: 'image/webp' },
    { format: 'jpeg', mime: 'image/jpeg' },
  ];

  const sources: OptimizedSource[] = [];
  let fallbackSrc = '';
  let fallbackSrcset = '';

  for (const { format, mime } of formats) {
    const variants = await Promise.all(
      IMAGE_WIDTHS.map(async (w) => {
        const result = await getImage({
          src: image,
          width: w,
          format,
        });
        return { w, src: result.src };
      }),
    );

    const srcset = variants.map((v) => `${v.src} ${v.w}w`).join(', ');

    if (format === 'jpeg') {
      // Fallback: largest width
      fallbackSrc = variants[variants.length - 1].src;
      fallbackSrcset = srcset;
    } else {
      sources.push({ type: mime, srcset });
    }
  }

  // Compute aspect-correct height from the original
  const aspectRatio = image.height / image.width;
  const displayWidth = image.width;
  const displayHeight = Math.round(displayWidth * aspectRatio);

  return {
    sources,
    src: fallbackSrc,
    srcset: fallbackSrcset,
    width: displayWidth,
    height: displayHeight,
    alt,
  };
}
