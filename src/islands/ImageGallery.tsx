import { useState, useCallback, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types — match the data prepared in .astro frontmatter
// ---------------------------------------------------------------------------

interface OptimizedSource {
  type: string;
  srcset: string;
}

export interface GalleryImageData {
  sources: OptimizedSource[];
  src: string;
  srcset: string;
  width: number;
  height: number;
  alt: string;
  kind: 'ai' | 'render' | 'photo';
  file: string;
}

/** Legacy Shopify image shape (fallback when no local images). */
interface ShopifyImage {
  url: string;
  altText: string | null;
}

interface Props {
  /** Pre-optimised local product images (from Astro getImage). */
  images?: GalleryImageData[];
  /** Legacy Shopify-hosted images. */
  shopifyImages?: ShopifyImage[];
  /** Inline SVG markup for the placeholder render pipeline. */
  placeholderSvg?: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImageGallery({
  images,
  shopifyImages,
  placeholderSvg,
  title,
}: Props) {
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  // Use local images if available, otherwise fall back to Shopify
  const hasLocalImages = images && images.length > 0;
  const hasShopifyImages = shopifyImages && shopifyImages.length > 0;
  const imageCount = hasLocalImages
    ? images.length
    : hasShopifyImages
      ? shopifyImages.length
      : 0;

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (imageCount <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelected((i) => (i - 1 + imageCount) % imageCount);
        setZoomed(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelected((i) => (i + 1) % imageCount);
        setZoomed(false);
      } else if (e.key === 'Escape' && zoomed) {
        setZoomed(false);
      }
    },
    [imageCount, zoomed],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown as any);
    return () => el.removeEventListener('keydown', handleKeyDown as any);
  }, [handleKeyDown]);

  // Touch / swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (imageCount <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      setSelected((i) => (dx < 0 ? (i + 1) % imageCount : (i - 1 + imageCount) % imageCount));
      setZoomed(false);
    }
  };

  // Check if selected image is 03-detail (opens zoomed)
  const handleMainClick = () => {
    if (!hasLocalImages) return;
    const img = images[selected];
    if (img.file.startsWith('03-detail')) {
      setZoomed((z) => !z);
    }
  };

  // --- No images at all: placeholder render ---
  if (imageCount === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-ground-panel p-6">
          {placeholderSvg ? (
            <div
              className="w-full max-w-[360px]"
              dangerouslySetInnerHTML={{ __html: placeholderSvg }}
            />
          ) : (
            <span className="font-mono text-xs text-ink-soft">[PRODUCT PHOTO]</span>
          )}
        </div>
      </div>
    );
  }

  // --- Shopify fallback (legacy path) ---
  if (!hasLocalImages && hasShopifyImages) {
    const imgs = shopifyImages;
    if (imgs.length === 1) {
      return (
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-ground-panel flex items-center justify-center">
          <img
            src={imgs[0].url}
            alt={imgs[0].altText ?? title}
            className="h-full w-full object-contain"
          />
        </div>
      );
    }
    const current = imgs[selected] ?? imgs[0];
    return (
      <div className="flex flex-col gap-3">
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-ground-panel flex items-center justify-center">
          <img
            src={current.url}
            alt={current.altText ?? title}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
          {imgs.slice(0, 8).map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setSelected(i)}
              className={`aspect-square overflow-hidden rounded-lg bg-ground-panel ${i === selected ? 'ring-2 ring-brand' : ''}`}
              aria-label={`View image ${i + 1}`}
            >
              <img
                src={img.url}
                alt={img.altText ?? ''}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- Local optimised images (primary path) ---
  // At this point hasLocalImages is true, so images is defined
  const localImages = images!;
  const current = localImages[selected] ?? localImages[0];
  const isDetail = current.file.startsWith('03-detail');

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3"
      tabIndex={0}
      role="region"
      aria-label="Product image gallery"
      aria-roledescription="carousel"
      data-gallery
    >
      {/* Hero image */}
      <div
        className={`overflow-hidden rounded-xl bg-ground-panel flex items-center justify-center ${
          zoomed ? 'cursor-zoom-out' : isDetail ? 'cursor-zoom-in' : ''
        } ${zoomed ? '' : 'aspect-[4/3]'}`}
        onClick={handleMainClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <picture>
          {current.sources.map((s) => (
            <source key={s.type} type={s.type} srcSet={s.srcset} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 520px" />
          ))}
          <img
            src={current.src}
            srcSet={current.srcset}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 520px"
            alt={current.alt}
            width={current.width}
            height={current.height}
            className={`${zoomed ? 'w-full' : 'h-full w-full object-contain'}`}
            loading={selected === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        </picture>
      </div>

      {/* Thumbnail strip */}
      {localImages.length > 1 && (
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8" role="tablist" aria-label="Gallery thumbnails">
          {localImages.slice(0, 8).map((img, i) => (
            <button
              key={img.file}
              type="button"
              role="tab"
              aria-selected={i === selected}
              onClick={() => { setSelected(i); setZoomed(false); }}
              className={`aspect-square overflow-hidden rounded-lg bg-ground-panel ${
                i === selected ? 'ring-2 ring-brand' : ''
              }`}
              aria-label={`View image ${i + 1}`}
              title={img.alt}
            >
              <picture>
                {img.sources.map((s) => (
                  <source key={s.type} type={s.type} srcSet={s.srcset} sizes="80px" />
                ))}
                <img
                  src={img.src}
                  srcSet={img.srcset}
                  sizes="80px"
                  alt=""
                  width={img.width}
                  height={img.height}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
