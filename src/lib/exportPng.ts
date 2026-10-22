/**
 * PNG export — rasterise the SVG at 300 dpi using an off-screen canvas.
 * Browser-only (requires Image, Canvas, Blob).
 * 300 dpi means 1 mm = 300/25.4 ≈ 11.811 px.
 */

/** Pixels per mm at 300 dpi. */
export const PX_PER_MM = 300 / 25.4;

export interface PngExportOptions {
  /** SVG markup string (from checkerboardSvg). */
  svg: string;
  /** Page width in mm. */
  pw: number;
  /** Page height in mm. */
  ph: number;
}

/**
 * Rasterise an SVG string to a 300 dpi PNG Blob.
 * The canvas pixel dimensions are pw×PX_PER_MM by ph×PX_PER_MM (rounded).
 */
export function exportPng({ svg, pw, ph }: PngExportOptions): Promise<Blob> {
  const widthPx = Math.round(pw * PX_PER_MM);
  const heightPx = Math.round(ph * PX_PER_MM);

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
      // White background
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, widthPx, heightPx);
      ctx.drawImage(img, 0, 0, widthPx, heightPx);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('toBlob returned null'));
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load SVG into Image'));
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    img.src = URL.createObjectURL(blob);
  });
}
