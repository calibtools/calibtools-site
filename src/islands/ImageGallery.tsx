import { useState } from 'react';

interface GalleryImage {
  url: string;
  altText: string | null;
}

interface Props {
  images: GalleryImage[];
  /** Inline SVG markup for a placeholder render (used when no Shopify images). */
  placeholderSvg?: string;
  title: string;
}

export default function ImageGallery({ images, placeholderSvg, title }: Props) {
  const [selected, setSelected] = useState(0);

  // No images from Shopify — show placeholder render
  if (images.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-ground-panel p-6">
          {placeholderSvg ? (
            <div className="w-full max-w-[360px]" dangerouslySetInnerHTML={{ __html: placeholderSvg }} />
          ) : (
            <span className="font-mono text-xs text-ink-soft">[PRODUCT PHOTO]</span>
          )}
        </div>
        {placeholderSvg && (
          <span className="text-center text-xs text-ink-soft">Rendering — photo coming</span>
        )}
      </div>
    );
  }

  // Single image — no thumbnails
  if (images.length === 1) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-ground-panel flex items-center justify-center">
        <img src={images[0].url} alt={images[0].altText ?? title} className="h-full w-full object-contain" />
      </div>
    );
  }

  // Multiple images — main + thumbnail strip
  const current = images[selected] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-ground-panel flex items-center justify-center">
        <img src={current.url} alt={current.altText ?? title} className="h-full w-full object-contain" />
      </div>
      <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
        {images.slice(0, 8).map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setSelected(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(i); } }}
            className={`aspect-square overflow-hidden rounded-lg bg-ground-panel ${i === selected ? 'ring-2 ring-brand' : ''}`}
            aria-label={`View image ${i + 1}`}
          >
            <img src={img.url} alt={img.altText ?? ''} className="h-full w-full object-contain" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
