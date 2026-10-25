/**
 * Utility functions for collection (family) pages.
 */

/**
 * Inner corner count for a checkerboard grid.
 * OpenCV's findChessboardCorners detects (rows-1)*(cols-1) inner corners.
 */
export function cornersCount(rows: number, cols: number): number {
  return (rows - 1) * (cols - 1);
}

/**
 * Human-readable availability label from lead_time metafield and variant
 * availableForSale flag. Matches the vocabulary used on Thorlabs family pages.
 */
export function availabilityLabel(
  leadTime: string | undefined,
  availableForSale: boolean,
): string {
  if (leadTime) return leadTime;
  return 'Made to order';
}

/**
 * Split rendered collection markdown HTML into sections keyed by <h2> heading text.
 * Returns e.g. { "Overview": "<p>...</p>", "Specifications": "<p>...</p>" }.
 * Content before the first <h2> is stored under the key "".
 */
export function parseCollectionSections(html: string): Record<string, string> {
  const sections: Record<string, string> = {};
  // Split on <h2...>...</h2> but keep the heading text as key
  const parts = html.split(/<h2[^>]*>([\s\S]*?)<\/h2>/i);

  // parts[0] = content before first h2
  // parts[1] = first h2 text, parts[2] = content after first h2
  // parts[3] = second h2 text, parts[4] = content after second h2, etc.

  if (parts[0]?.trim()) {
    sections[''] = parts[0].trim();
  }

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].replace(/<[^>]+>/g, '').trim();
    const content = parts[i + 1]?.trim() ?? '';
    if (heading) {
      sections[heading] = content;
    }
  }

  return sections;
}
