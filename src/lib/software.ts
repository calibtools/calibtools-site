/**
 * Single source of truth for Plumbline, the Calib.Tools desktop calibration software.
 * Read by the header navigation, /plumbline/ and scripts/check-downloads.ts. For a new build
 * (beta 2, rc 1, the release) change RELEASE below and nothing else: the page, the file links and the
 * structured data are all built from it.
 *
 * Status 2026-11-23: 0.1.0 beta 1 is out as a public beta. Installers are not signed.
 */
export type SoftwareStatus = 'beta' | 'released';

export interface SoftwareDef {
  name: string;
  href: string;
  status: SoftwareStatus;
  /** Version as people read it, e.g. "0.1.0 beta 1". */
  version: string;
  platforms: readonly string[];
}

export type Platform = 'Windows' | 'macOS' | 'Linux';

export interface ReleaseFile {
  platform: Platform;
  /** What the main button or the side link says. */
  label: string;
  /** Who this file is for, shown beside the size. */
  fits: string;
  file: string;
  bytes: number;
  sha256: string;
  /** The file the platform's button points to; the other one is offered as a link beside it. */
  primary: boolean;
}

const VERSION = '0.1.0 beta 1';
const FILE_VERSION = '0.1.0-beta.1';
const TAG = `v${FILE_VERSION}`;
const REPO = 'https://github.com/calibtools/plumbline';

/**
 * The current build. File names, sizes in bytes and SHA-256 values are those of the GitHub release
 * (calibtools/plumbline, tag v0.1.0-beta.1, commit a45b113), read back on 2026-11-23.
 */
export const RELEASE = {
  version: VERSION,
  fileVersion: FILE_VERSION,
  tag: TAG,
  stage: 'beta',
  released: '2026-11-23',
  base: `${REPO}/releases/download/${TAG}/`,
  notes: `${REPO}/blob/main/CHANGELOG.md`,
  checksums: 'SHA256SUMS.txt',
  /** Systems the installers were built and started on. Older systems were not tried. */
  builtOn: 'Windows 11, macOS 15 and Ubuntu 22.04',
  files: [
    { platform: 'Windows', label: 'Windows', fits: '64-bit installer', file: `Plumbline-${FILE_VERSION}-windows-x64-setup.exe`, bytes: 69_727_262, sha256: 'deeffc0548fd6120f403b934b899aac597eb9b5cde2b8e63674ada7ddaef6326', primary: true },
    { platform: 'macOS', label: 'macOS', fits: 'Apple silicon', file: `Plumbline-${FILE_VERSION}-macos-arm64.dmg`, bytes: 49_010_123, sha256: 'd048a9ef4e6652e47b76565d9818a12660c16afe82394ce81f5d2d7a63be1506', primary: true },
    { platform: 'macOS', label: 'Intel Mac', fits: 'Intel', file: `Plumbline-${FILE_VERSION}-macos-x64.dmg`, bytes: 69_902_247, sha256: '2b9b25ce6d0e29a32623902556dc2de430848472e2ae3be15d3d368ae264320d', primary: false },
    { platform: 'Linux', label: 'Linux', fits: 'AppImage, 64-bit x86', file: `Plumbline-${FILE_VERSION}-linux-x86_64.AppImage`, bytes: 140_827_128, sha256: 'c1f354ab5e593bcab021e4b85079eaca9c26f56b7050d71431d520a7bed4f88f', primary: true },
    { platform: 'Linux', label: '.tar.xz', fits: 'archive, 64-bit x86', file: `Plumbline-${FILE_VERSION}-linux-x86_64.tar.xz`, bytes: 106_457_488, sha256: '0b8145eb3b1cf587f37d36c40e451bcdf4525e8bf5cdb7729b21292ff0c0870a', primary: false },
  ] as readonly ReleaseFile[],
  /** The 0.1.0 section of CHANGELOG.md at the tag, in its own wording. Not rewritten for the page. */
  contents: [
    { group: 'One camera', items: [
      'Targets: ChArUco, checkerboard, circle grid, asymmetric circle grid, AprilGrid (Kalibr layout), ArUco grid; Calib.Tools boards by part number',
      'Lens models: OpenCV standard (optional k3, tangential, rational, thin prism) and fisheye',
      'Error for every image; leave an image out and solve again; coverage map',
      'A ± for every parameter, and a map of how well the result is pinned down across the image',
      'Residuals map with a hint when the lens model does not fit',
      'A board that is not flat is noticed; its shape can be solved together with the camera',
      'A misplaced point of the board is found; a row or column that no image shows is pointed out',
      'A few far-off points that steer the result are pointed out',
      'Corrected view of any image',
    ] },
    { group: 'Several cameras', items: [
      'Two to eight cameras, told apart and matched by file name; standard and fisheye lenses can be mixed',
      'Where every camera sits relative to camera 1, with ±',
      'Two cameras: row-aligned images and a short example program',
      'Check with images that took no part: lengths on the board, measured by the cameras',
    ] },
    { group: 'Several boards', items: [
      'Up to four boards of the same kind in every image, each found by its own marker numbers',
      'Boards fixed to each other can be solved as one object',
    ] },
    { group: 'Files', items: [
      'OpenCV YAML and XML, JSON, ROS camera_info, Excel, PDF report, lookup tables, Python example, project file',
      'Files are named by project and revision and never overwrite older ones',
    ] },
    { group: 'App', items: [
      'Built-in samples for one camera and for two',
      'About window with version details and a way to report a problem',
    ] },
  ],
  limits: [
    'Checked with rendered images only; photographs of real boards are still to come',
    'Installers are not signed: Windows and macOS warn when the app is first opened',
  ],
} as const;

export const software: SoftwareDef = {
  name: 'Plumbline',
  href: '/plumbline/',
  status: RELEASE.stage,
  version: RELEASE.version,
  platforms: ['Windows', 'macOS', 'Linux'],
};

/** Download address of one release file. */
export const fileUrl = (f: Pick<ReleaseFile, 'file'> | string): string => RELEASE.base + (typeof f === 'string' ? f : f.file);

/** File size as shown on the page: 1 MB = 1,048,576 bytes, one decimal. */
export const sizeMb = (bytes: number): string => `${(bytes / 1_048_576).toFixed(1)} MB`;

/** The button file and the side-link file of each platform, in page order. */
export function downloadsByPlatform(): { platform: Platform; main: ReleaseFile; other?: ReleaseFile }[] {
  return (software.platforms as readonly Platform[]).map((platform) => {
    const files = RELEASE.files.filter((f) => f.platform === platform);
    return { platform, main: files.find((f) => f.primary)!, other: files.find((f) => !f.primary) };
  });
}

/** Tag set on people who ask to be told about new versions (POST /api/subscribe). */
export const NOTIFY_TAG = 'notify:plumbline';

/**
 * What Plumbline reports for the 24 sample images that come with it. The images are rendered from
 * a known camera (fx = fy = 1500 px, 1280 x 960), so the result can be compared with the truth.
 * Images 07 and 18 are spoiled on purpose: the board moves 2 mm while the rows of the image are read
 * out. The top-level values are the first calibration, with all 24 images; `kept` is the calibration
 * after those two are left out.
 * Worked out with the released code (calibtools/plumbline v0.1.0-beta.1, OpenCV 5.0.0, the version in
 * the installers) by docs/plumbline/sample-figures/sample_figures.py; its output is saved beside it and
 * software.test.ts checks these values against it. cameraInfo is the ROS export up to the distortion
 * coefficients. The figures on /plumbline/ are drawn from these values; do not edit them by hand.
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
    cameraInfo: "image_width: 1280\nimage_height: 960\ncamera_name: camera\ncamera_matrix:\n  rows: 3\n  cols: 3\n  data: [1499.5475706376997, 0.0, 639.8249678562416, 0.0, 1499.5528430324414, 480.3392134285066, 0.0, 0.0, 1.0]\ndistortion_model: plumb_bob\ndistortion_coefficients:\n  rows: 1\n  cols: 5\n  data: [-0.12068437643973885, 0.10299901617553887, 0.0005047619138768041, -0.0003330052302585554, 0.0]",
  },
} as const;

/** Share of coverage cells that hold at least one corner, in percent. */
export function coveragePercent(grid: readonly (readonly number[])[]): number {
  const cells = grid.flat();
  return Math.round((cells.filter((n) => n > 0).length / cells.length) * 100);
}
