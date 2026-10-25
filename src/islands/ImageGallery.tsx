import { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from '@/lib/icons';

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
// Unified image shape for the lightbox
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Lightbox component
// ---------------------------------------------------------------------------

interface LightboxProps {
  images: LightboxImage[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  openerRef: React.RefObject<HTMLElement | null>;
}

function Lightbox({ images, index, onIndexChange, onClose, openerRef }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const pinchStartDist = useRef(0);
  const lastTap = useRef(0);
  const count = images.length;
  const current = images[index];

  // Open the dialog on mount
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Close handler — returns focus
  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    document.body.style.overflow = '';
    openerRef.current?.focus();
    onClose();
  }, [onClose, openerRef]);

  const prev = useCallback(() => {
    setZoomed(false);
    onIndexChange((index - 1 + count) % count);
  }, [index, count, onIndexChange]);

  const next = useCallback(() => {
    setZoomed(false);
    onIndexChange((index + 1) % count);
  }, [index, count, onIndexChange]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close, prev, next]);

  // Backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) close();
  };

  // Desktop click-to-zoom
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoomed) {
      setZoomed(false);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setOrigin({ x, y });
      setZoomed(true);
    }
  };

  // Touch: swipe & double-tap & pinch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Double tap detection
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setZoomed((z) => !z);
      if (!zoomed) {
        const touch = e.changedTouches[0];
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setOrigin({
          x: ((touch.clientX - rect.left) / rect.width) * 100,
          y: ((touch.clientY - rect.top) / rect.height) * 100,
        });
      }
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;

    // Swipe detection (single finger, not zoomed)
    if (!zoomed && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) next(); else prev();
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Pinch-to-zoom
    if (e.touches.length === 2 && pinchStartDist.current > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (dist > pinchStartDist.current * 1.3) {
        setZoomed(true);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setOrigin({
          x: ((midX - rect.left) / rect.width) * 100,
          y: ((midY - rect.top) / rect.height) * 100,
        });
        pinchStartDist.current = 0;
      } else if (dist < pinchStartDist.current * 0.7) {
        setZoomed(false);
        pinchStartDist.current = 0;
      }
    }
  };

  // Reset zoom on image change
  useEffect(() => { setZoomed(false); }, [index]);

  return (
    <dialog
      ref={dialogRef}
      className="lightbox-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Product images"
      onClick={handleBackdropClick}
      data-lightbox
    >
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          type="button"
          className="lightbox-close"
          onClick={close}
          aria-label="Close lightbox"
          data-lightbox-close
        >
          <X size={24} strokeWidth={1.6} aria-hidden="true" />
        </button>

        {/* Previous */}
        {count > 1 && (
          <button
            type="button"
            className="lightbox-nav lightbox-prev"
            onClick={prev}
            aria-label="Previous image"
            data-lightbox-prev
          >
            <ChevronLeft size={28} strokeWidth={1.6} aria-hidden="true" />
          </button>
        )}

        {/* Image */}
        <div
          className="lightbox-img-wrap"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {current.sources && current.sources.length > 0 ? (
            <picture>
              {current.sources.map((s) => (
                <source key={s.type} type={s.type} srcSet={s.srcset} sizes="100vw" />
              ))}
              <img
                ref={imgRef}
                src={current.src}
                srcSet={current.srcset}
                sizes="100vw"
                alt={current.alt}
                width={current.width}
                height={current.height}
                className={`lightbox-img ${zoomed ? 'lightbox-img--zoomed' : ''}`}
                style={zoomed ? { transformOrigin: `${origin.x}% ${origin.y}%`, cursor: 'zoom-out' } : { cursor: 'zoom-in' }}
                onClick={handleImageClick}
                draggable={false}
                data-lightbox-img
              />
            </picture>
          ) : (
            <img
              ref={imgRef}
              src={current.src}
              alt={current.alt}
              className={`lightbox-img ${zoomed ? 'lightbox-img--zoomed' : ''}`}
              style={zoomed ? { transformOrigin: `${origin.x}% ${origin.y}%`, cursor: 'zoom-out' } : { cursor: 'zoom-in' }}
              onClick={handleImageClick}
              draggable={false}
              data-lightbox-img
            />
          )}
        </div>

        {/* Next */}
        {count > 1 && (
          <button
            type="button"
            className="lightbox-nav lightbox-next"
            onClick={next}
            aria-label="Next image"
            data-lightbox-next
          >
            <ChevronRight size={28} strokeWidth={1.6} aria-hidden="true" />
          </button>
        )}

        {/* Caption */}
        <div className="lightbox-caption" data-lightbox-caption>
          <span className="lightbox-caption-alt">{current.alt}</span>
          {count > 1 && (
            <span className="lightbox-caption-count">{index + 1} / {count}</span>
          )}
        </div>
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Main gallery component
// ---------------------------------------------------------------------------

export default function ImageGallery({
  images,
  shopifyImages,
  placeholderSvg,
  title,
}: Props) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef(0);

  const hasLocalImages = images && images.length > 0;
  const hasShopifyImages = shopifyImages && shopifyImages.length > 0;
  const imageCount = hasLocalImages
    ? images.length
    : hasShopifyImages
      ? shopifyImages.length
      : 0;

  const lightboxImages = toLightboxImages(images, shopifyImages, title);

  // Keyboard navigation (inline gallery, not lightbox)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxOpen) return;
      if (imageCount <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelected((i) => (i - 1 + imageCount) % imageCount);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelected((i) => (i + 1) % imageCount);
      }
    },
    [imageCount, lightboxOpen],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown as any);
    return () => el.removeEventListener('keydown', handleKeyDown as any);
  }, [handleKeyDown]);

  // Touch / swipe on hero
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (imageCount <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      setSelected((i) => (dx < 0 ? (i + 1) % imageCount : (i - 1 + imageCount) % imageCount));
    }
  };

  // Open lightbox
  const openLightbox = (idx: number, el: HTMLElement) => {
    openerRef.current = el;
    setSelected(idx);
    setLightboxOpen(true);
  };

  const handleHeroClick = (e: React.MouseEvent) => {
    openLightbox(selected, e.currentTarget as HTMLElement);
  };

  const handleHeroKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLightbox(selected, e.currentTarget as HTMLElement);
    }
  };

  // Lightbox index sync
  const handleLightboxIndexChange = (i: number) => {
    setSelected(i);
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
    const current = imgs[selected] ?? imgs[0];
    return (
      <div className="flex flex-col gap-3" ref={containerRef} tabIndex={0} data-gallery>
        <div
          className="aspect-[4/3] overflow-hidden rounded-xl bg-ground-panel flex items-center justify-center cursor-zoom-in"
          onClick={handleHeroClick}
          onKeyDown={handleHeroKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`Open image ${selected + 1} of ${imgs.length} in full screen`}
        >
          <img
            src={current.url}
            alt={current.altText ?? title}
            className="h-full w-full object-contain"
          />
        </div>
        {imgs.length > 1 && (
          <div className="grid grid-cols-4 gap-3 md:grid-cols-8" role="tablist" aria-label="Gallery thumbnails">
            {imgs.slice(0, 8).map((img, i) => (
              <button
                key={img.url}
                type="button"
                role="tab"
                aria-selected={i === selected}
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
        )}
        {lightboxOpen && lightboxImages.length > 0 && (
          <Lightbox
            images={lightboxImages}
            index={selected}
            onIndexChange={handleLightboxIndexChange}
            onClose={() => setLightboxOpen(false)}
            openerRef={openerRef}
          />
        )}
      </div>
    );
  }

  // --- Local optimised images (primary path) ---
  const localImages = images!;
  const current = localImages[selected] ?? localImages[0];

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
        className="overflow-hidden rounded-xl bg-ground-panel flex items-center justify-center cursor-zoom-in aspect-[4/3]"
        onClick={handleHeroClick}
        onKeyDown={handleHeroKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="button"
        tabIndex={0}
        aria-label={`Open image ${selected + 1} of ${imageCount} in full screen`}
        data-hero-trigger
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
            className="h-full w-full object-contain"
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
              onClick={() => setSelected(i)}
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

      {/* Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <Lightbox
          images={lightboxImages}
          index={selected}
          onIndexChange={handleLightboxIndexChange}
          onClose={() => setLightboxOpen(false)}
          openerRef={openerRef}
        />
      )}
    </div>
  );
}
