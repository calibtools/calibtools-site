/**
 * The picture a product card shows, chosen the same way on every page that lists products
 * (catalog, related products in guides, application pages, "Pairs with").
 * Order: line drawing from catalog geometry → our own hero photo → the store's featured image.
 * The store image comes last: for boards it can still be an old generated placeholder.
 */
import type { ImageMetadata } from 'astro';
import { drawingForPartNumber, representativePartNumber } from '@/lib/boardDrawing';
import { getProductImages } from '@/lib/product-images';
import { getImageMetadata } from '@/lib/productImageImports';

export interface CardVisual {
  drawing?: string;
  drawingCaption?: string;
  localImage?: ImageMetadata;
  image?: string;
}

export function productCardVisual(handle: string, storeImage?: string): CardVisual {
  const pn = representativePartNumber(handle);
  const svg = pn ? drawingForPartNumber(pn, { dimensions: false }) : undefined;
  const hero = getProductImages(handle).find((img) => img.file === '01-hero.webp');
  const localImage = hero ? getImageMetadata(hero.handle, hero.file) ?? undefined : undefined;
  return {
    drawing: svg,
    drawingCaption: svg ? pn : undefined,
    localImage,
    image: localImage ? undefined : storeImage,
  };
}
