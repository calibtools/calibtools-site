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
  'color-chart': 'lidar-image-quality',
  'grayscale-oecf-chart': 'lidar-image-quality',
  'focus-siemens-star-chart': 'lidar-image-quality',
  'resolution-targets-glass': 'lidar-image-quality',
  'grid-distortion-target': 'lidar-image-quality',
  'backlit-target': 'lidar-image-quality',
  "lidar-camera-target": 'multi-sensor',
  "thermal-calibration-target": 'multi-sensor',
  "nir-calibration-target": 'multi-sensor',
  "depth-camera-target": 'multi-sensor',
  "hand-eye-calibration-kit": 'multi-sensor',
  "multi-camera-target": 'multi-sensor',
  "line-scan-target": 'multi-sensor',
  "radar-camera-target": 'multi-sensor',
  'mounting-fixture': 'mounts-accessories',
};

/** Sibling collection nav items. */
export const COLLECTION_SIBLINGS = [
  { handle: 'composite-boards', label: 'Composite Targets' },
  { handle: 'ceramic-glass', label: 'Ceramic & Glass' },
  { handle: 'lidar-image-quality', label: 'LiDAR & IQ' },
  { handle: 'multi-sensor', label: 'Multi-sensor' },
  { handle: 'mounts-accessories', label: 'Accessories' },
] as const;

/** Quote-only product families defined locally (no Shopify variants yet). */
export const MULTI_SENSOR_HANDLES: string[] = ["lidar-camera-target", "thermal-calibration-target", "nir-calibration-target", "depth-camera-target", "hand-eye-calibration-kit", "multi-camera-target", "line-scan-target", "radar-camera-target"];

/** Quote-only image-quality and metrology families defined locally (no Shopify variants yet). */
export const IMAGE_QUALITY_HANDLES: string[] = ['reflectance-panel', 'resolution-chart', 'color-chart', 'grayscale-oecf-chart', 'focus-siemens-star-chart', 'resolution-targets-glass', 'grid-distortion-target', 'backlit-target'];

/** Products sold on quote only: no cart, "Request a quote" CTA. */
export const QUOTE_ONLY_HANDLES: string[] = [...IMAGE_QUALITY_HANDLES, ...MULTI_SENSOR_HANDLES];
