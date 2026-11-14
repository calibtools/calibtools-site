/**
 * Single source of truth for header and footer navigation.
 * Imported by Nav.astro and Footer.astro.
 */

import { tools } from './tools';

// ── Types ────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  live?: boolean;
  description?: string;
}

export interface MegaMenuColumn {
  heading: string;
  items: NavItem[];
}

export interface NavGroup {
  key: string;
  label: string;
  /** Direct link (no dropdown). */
  href?: string;
  /** Dropdown items (flat list). */
  items?: NavItem[];
  /** Mega-menu columns. */
  columns?: MegaMenuColumn[];
}

export interface FooterGroup {
  heading: string;
  items: NavItem[];
}

// ── Targets mega-menu ────────────────────────────────────────────────

export const targetsMega: MegaMenuColumn[] = [
  {
    heading: 'By pattern',
    items: [
      { label: 'Checkerboard targets', href: '/targets/checkerboard-composite/' },
      { label: 'ChArUco boards', href: '/targets/charuco-composite/' },
      { label: 'AprilGrid boards', href: '/targets/aprilgrid-composite/' },
      { label: 'Circle grid targets', href: '/targets/circlegrid-composite/' },
      { label: 'HALCON calibration plates', href: '/targets/halcon-composite/' },
    ],
  },
  {
    heading: 'By material',
    items: [
      { label: 'Composite targets', href: '/targets/collection/composite-boards/' },
      { label: 'Ceramic & glass targets', href: '/targets/collection/ceramic-glass/' },
      { label: 'ChArUco ceramic', href: '/targets/charuco-ceramic/' },
      { label: 'LiDAR & image quality', href: '/targets/collection/lidar-image-quality/' },
      { label: 'Multi-sensor & specialty', href: '/targets/collection/multi-sensor/' },
    ],
  },
  {
    heading: 'Accessories',
    items: [
      { label: 'Target mounting fixture', href: '/targets/mounting-fixture/' },
      { label: 'Mounts & Accessories', href: '/targets/collection/mounts-accessories/' },
      { label: 'All targets', href: '/targets/' },
    ],
  },
];

// ── Tools dropdown (generator first, separated, then other tools) ────

const generatorTool = tools.find((t) => t.key === 'generator')!;

/** The first item (Pattern generator) is promoted with weight 600 and 8px separator after it. */
export const toolsDropdown: NavItem[] = [
  { label: generatorTool.title, href: generatorTool.href, description: generatorTool.body },
  ...tools
    .filter((t) => t.key !== 'generator')
    .map((t) => ({ label: t.title, href: t.href, description: t.body })),
  { label: 'All tools', href: '/tools/' },
];

// ── Support dropdown ─────────────────────────────────────────────────

export const supportDropdown: NavItem[] = [
  { label: 'FAQ', href: '/faq/' },
  { label: 'Shipping, duties & taxes', href: '/shipping/' },
  { label: 'Returns', href: '/returns/' },
  { label: 'Files & downloads', href: '/files/' },
  { label: 'Verify a serial', href: '/verify/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
];

// ── Header groups (left to right) ────────────────────────────────────

export const headerGroups: NavGroup[] = [
  { key: 'targets', label: 'Targets', columns: targetsMega },
  { key: 'tools', label: 'Tools', items: toolsDropdown },
  { key: 'applications', label: 'Applications', href: '/applications/' },
  { key: 'guides', label: 'Guides', href: '/guides/' },
  { key: 'support', label: 'Support', items: supportDropdown },
];

// ── Footer groups ────────────────────────────────────────────────────

export const footerGroups: FooterGroup[] = [
  {
    heading: 'Targets',
    items: [
      { label: 'All targets', href: '/targets/' },
      { label: 'Targets by application', href: '/applications/' },
      { label: 'Aluminum Composite Targets', href: '/targets/collection/composite-boards/' },
      { label: 'Ceramic & Glass Targets', href: '/targets/collection/ceramic-glass/' },
      { label: 'LiDAR & Image Quality Targets', href: '/targets/collection/lidar-image-quality/' },
      { label: 'Multi-Sensor & Specialty Targets', href: '/targets/collection/multi-sensor/' },
      { label: 'Mounts & Accessories', href: '/targets/collection/mounts-accessories/' },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { label: 'Pattern generator', href: '/tools/generator/' },
      { label: 'FOV calculator', href: '/tools/fov/' },
      { label: 'Target wizard', href: '/tools/wizard/' },
      { label: 'Format converter', href: '/tools/convert/' },
      { label: 'Detection check', href: '/tools/check/' },
      { label: 'Quality analyzer', href: '/tools/quality/' },
      { label: 'Capture assistant', href: '/tools/capture/' },
    ],
  },
  {
    heading: 'Generators',
    items: [
      { label: 'Checkerboard generator', href: '/tools/generator/checkerboard/' },
      { label: 'ChArUco generator', href: '/tools/generator/charuco/' },
      { label: 'AprilGrid generator', href: '/tools/generator/aprilgrid/' },
      { label: 'Circle grid generator', href: '/tools/generator/circles/' },
      { label: 'ArUco marker generator', href: '/tools/generator/aruco/' },
      { label: 'AprilTag generator', href: '/tools/generator/apriltag/' },
    ],
  },
  {
    heading: 'Support',
    items: [
      { label: 'FAQ', href: '/faq/' },
      { label: 'Shipping, duties & taxes', href: '/shipping/' },
      { label: 'Returns', href: '/returns/' },
      { label: 'Files & downloads', href: '/files/' },
      { label: 'Verify a serial', href: '/verify/' },
      { label: 'Contact', href: '/contact/' },
    ],
  },
  {
    heading: 'Company',
    items: [
      { label: 'About', href: '/about/' },
      { label: 'Legal notice', href: '/imprint/' },
      { label: 'Privacy', href: '/privacy/' },
    ],
  },
];
