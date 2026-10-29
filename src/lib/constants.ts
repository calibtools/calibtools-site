/** Warranty text for product pages. */
export const WARRANTY_TEXT =
  'All Calib.Tools targets are covered by a 2-year warranty against manufacturing defects in materials and workmanship. The warranty does not cover damage from misuse, modification, or normal wear.';

/** Compliance data for product pages. */
export const COMPLIANCE = {
  rohs: 'RoHS compliant',
  hsCode: 'HS 9031 80',
} as const;

/**
 * Map product handle prefixes to their parent collection handle.
 * Used for "back to family page" links on product pages.
 */
export const PRODUCT_TO_COLLECTION: Record<string, string> = {
  'checkerboard-composite': 'composite-boards',
  'charuco-composite': 'composite-boards',
  'aprilgrid-composite': 'composite-boards',
  'circlegrid-composite': 'composite-boards',
  'halcon-composite': 'composite-boards',
  'checkerboard-ceramic': 'ceramic-glass',
  'charuco-ceramic': 'ceramic-glass',
  'reflectance-panel': 'lidar-image-quality',
  'resolution-chart': 'lidar-image-quality',
  'ir-board': 'lidar-image-quality',
  'mounting-fixture': 'mounts-accessories',
  'certificate-ilac': 'mounts-accessories',
};

/** Sibling collection nav items. */
export const COLLECTION_SIBLINGS = [
  { handle: 'composite-boards', label: 'Composite' },
  { handle: 'ceramic-glass', label: 'Ceramic & glass' },
  { handle: 'lidar-image-quality', label: 'LiDAR & IQ' },
  { handle: 'mounts-accessories', label: 'Accessories' },
] as const;
