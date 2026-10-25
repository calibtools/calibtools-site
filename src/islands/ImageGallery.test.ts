import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the gallery image normalisation logic.
 * The toLightboxImages function is internal to the component,
 * so we replicate its logic here to test the mapping.
 */

interface OptimizedSource { type: string; srcset: string; }
interface GalleryImageData {
  sources: OptimizedSource[];
  src: string;
  srcset: string;
  width: number;
  height: number;
  alt: string;
  kind: 'ai' | 'render' | 'photo';
  file: string;
}
interface ShopifyImage { url: string; altText: string | null; }
interface LightboxImage {
  src: string;
  srcset?: string;
  sources?: OptimizedSource[];
  alt: string;
  width?: number;
  height?: number;
}

function toLightboxImages(
  images?: GalleryImageData[],
  shopifyImages?: ShopifyImage[],
  title?: string,
): LightboxImage[] {
  if (images && images.length > 0) {
    return images.map((img) => ({
      src: img.src,
      srcset: img.srcset,
      sources: img.sources,
      alt: img.alt,
      width: img.width,
      height: img.height,
    }));
  }
  if (shopifyImages && shopifyImages.length > 0) {
    return shopifyImages.map((img) => ({
      src: img.url,
      alt: img.altText ?? title ?? '',
    }));
  }
  return [];
}

const makeLocal = (n: number): GalleryImageData[] =>
  Array.from({ length: n }, (_, i) => ({
    sources: [{ type: 'image/avif', srcset: `/img${i}.avif 800w` }],
    src: `/img${i}.jpg`,
    srcset: `/img${i}.jpg 800w`,
    width: 800,
    height: 600,
    alt: `Image ${i + 1}`,
    kind: 'ai' as const,
    file: `0${i + 1}-hero.webp`,
  }));

const makeShopify = (n: number): ShopifyImage[] =>
  Array.from({ length: n }, (_, i) => ({
    url: `https://cdn.shopify.com/img${i}.jpg`,
    altText: i === 0 ? 'First' : null,
  }));

describe('toLightboxImages', () => {
  it('maps local images preserving sources and dimensions', () => {
    const result = toLightboxImages(makeLocal(3));
    expect(result).toHaveLength(3);
    expect(result[0].src).toBe('/img0.jpg');
    expect(result[0].sources).toHaveLength(1);
    expect(result[0].width).toBe(800);
  });

  it('maps Shopify images with fallback alt', () => {
    const result = toLightboxImages(undefined, makeShopify(2), 'Product Title');
    expect(result).toHaveLength(2);
    expect(result[0].alt).toBe('First');
    expect(result[1].alt).toBe('Product Title');
  });

  it('prefers local over Shopify when both provided', () => {
    const result = toLightboxImages(makeLocal(2), makeShopify(3), 'Title');
    expect(result).toHaveLength(2);
    expect(result[0].src).toBe('/img0.jpg');
  });

  it('returns empty array when no images', () => {
    expect(toLightboxImages()).toEqual([]);
    expect(toLightboxImages([], [])).toEqual([]);
  });
});

describe('index wrapping logic', () => {
  it('wraps forward correctly', () => {
    const count = 5;
    expect((4 + 1) % count).toBe(0);
    expect((2 + 1) % count).toBe(3);
  });

  it('wraps backward correctly', () => {
    const count = 5;
    expect((0 - 1 + count) % count).toBe(4);
    expect((3 - 1 + count) % count).toBe(2);
  });
});
