/**
 * Single source of truth for Plumbline, the Calib.Tools desktop calibration software.
 * Read by the header navigation and /plumbline/. Every page that mentions Plumbline reads its
 * status from here, so the wording switches in one place when the first version ships.
 *
 * Status 2026-11-22: not released yet. Until then /plumbline/ shows a sign-up for the release email.
 */
export type SoftwareStatus = 'unreleased' | 'released';

export interface SoftwareDef {
  name: string;
  href: string;
  status: SoftwareStatus;
  /** Version string of the latest release; null before the first one. */
  version: string | null;
  platforms: readonly string[];
}

export const software: SoftwareDef = {
  name: 'Plumbline',
  href: '/plumbline/',
  status: 'unreleased',
  version: null,
  platforms: ['Windows', 'macOS', 'Linux'],
};

/** Shown where the download buttons will be, until the first release. The only place this wording is allowed (scripts/check-prose.mjs). */
export const COMING_SOON_LABEL = 'Coming soon';

/** Tag set on people who ask to be told about the release (POST /api/subscribe). */
export const NOTIFY_TAG = 'notify:plumbline';

/**
 * What Plumbline reports for the 24 sample images that come with it. The images are rendered from
 * a known camera (fx = fy = 1500 px, 1280 x 960), so the result can be compared with the truth.
 * Images 07 and 18 are spoiled on purpose: the board moves 2 mm while the rows of the image are read
 * out. The top-level values are the first calibration, with all 24 images; `kept` is the calibration
 * after those two are left out.
 * Worked out with the app's own code on 2026-11-23 (calibtools/plumbline, sample-with-spoiled-images,
 * OpenCV 5.1.0): per-image RMS error in px, corners counted per cell of the coverage map, and the
 * ROS export. The figures on /plumbline/ are drawn from these values; do not edit them by hand.
 */
export const SAMPLE = {
  trueFocalPx: 1500,
  spoiledImages: [7, 18],
  spoiledShiftMm: 2,
  focalPx: 1498.91,
  rmsPx: 0.116,
  corners: 1634,
  errorsPx: [0.0285, 0.0596, 0.0555, 0.0662, 0.0379, 0.0416, 0.4432, 0.0619, 0.0661, 0.0566, 0.0334, 0.0585, 0.0298, 0.054, 0.0388, 0.0672, 0.036, 0.2649, 0.0382, 0.0356, 0.0534, 0.0622, 0.0571, 0.0625],
  coverage: [[0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0], [0, 0, 1, 1, 3, 3, 4, 5, 5, 5, 5, 4, 3, 0, 0, 0], [0, 1, 3, 4, 7, 10, 9, 12, 12, 9, 10, 10, 7, 0, 0, 0], [0, 3, 3, 6, 10, 9, 17, 18, 19, 15, 13, 14, 8, 1, 2, 1], [0, 2, 4, 7, 11, 13, 15, 21, 25, 22, 19, 22, 16, 8, 3, 2], [0, 3, 5, 12, 17, 20, 24, 27, 41, 32, 32, 24, 21, 11, 4, 4], [0, 2, 5, 14, 22, 25, 31, 27, 39, 33, 27, 27, 20, 12, 7, 3], [0, 2, 7, 12, 17, 19, 19, 25, 29, 27, 21, 17, 14, 11, 8, 3], [0, 1, 4, 6, 12, 16, 21, 17, 22, 22, 23, 15, 11, 9, 6, 2], [0, 2, 4, 6, 9, 11, 14, 12, 18, 13, 10, 8, 4, 2, 2, 1], [0, 0, 2, 3, 7, 7, 5, 7, 7, 7, 4, 5, 2, 2, 2, 1], [0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0]],
  kept: {
    focalPx: 1499.55,
    rmsPx: 0.048,
    corners: 1497,
    errorsPx: [0.0192, 0.0581, 0.0469, 0.0622, 0.037, 0.0393, 0.0577, 0.0618, 0.0509, 0.0214, 0.0545, 0.0206, 0.0516, 0.0203, 0.0653, 0.0328, 0.036, 0.0334, 0.0516, 0.0613, 0.0489, 0.0614],
    cameraInfo: "image_width: 1280\nimage_height: 960\ncamera_name: camera\ncamera_matrix:\n  rows: 3\n  cols: 3\n  data: [1499.5475706376997, 0.0, 639.824967856241, 0.0, 1499.5528430324414, 480.3392134285066, 0.0, 0.0, 1.0]\ndistortion_model: plumb_bob\ndistortion_coefficients:\n  rows: 1\n  cols: 5\n  data: [-0.12068437643973873, 0.10299901617553982, 0.000504761913876782, -0.0003330052302586648, 0.0]",
  },
} as const;

/** Share of coverage cells that hold at least one corner, in percent. */
export function coveragePercent(grid: readonly (readonly number[])[]): number {
  const cells = grid.flat();
  return Math.round((cells.filter((n) => n > 0).length / cells.length) * 100);
}
