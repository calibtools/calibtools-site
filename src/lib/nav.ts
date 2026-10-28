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
      { label: 'ChArUco boards', href: '/targets/charuco-composite/' },
      { label: 'Checkerboard targets', href: '/targets/checkerboard-composite/' },
      { label: 'AprilGrid boards', href: '#', live: false },
      { label: 'Circle grid targets', href: '#', live: false },
      { label: 'HALCON calibration plates', href: '#', live: false },
    ],
  },
  {
    heading: 'By material',
    items: [
      { label: 'Composite boards', href: '/targets/collection/composite-boards/' },
      { label: 'Ceramic & glass targets', href: '/targets/collection/ceramic-glass/' },
      { label: 'ChArUco ceramic', href: '/targets/charuco-ceramic/' },
      { label: 'LiDAR & image quality', href: '/targets/collection/lidar-image-quality/' },
    ],
  },
  {
    heading: 'Services & accessories',
    items: [
      { label: 'ILAC calibration certificate', href: '/targets/certificate-ilac/' },
      { label: 'Mounting fixture', href: '/targets/mounting-fixture/' },
      { label: 'Mounts & accessories', href: '/targets/collection/mounts-accessories/' },
      { label: 'All targets', href: '/targets/' },
    ],
  },
];

// ── Tools dropdown (all tools except generator) ──────────────────────

export const toolsDropdown: NavItem[] = [
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
  { label: 'Verify a report', href: '/verify/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
];

// ── Header groups (left to right) ────────────────────────────────────

export const headerGroups: NavGroup[] = [
  { key: 'targets', label: 'Targets', columns: targetsMega },
  { key: 'generator', label: 'Pattern generator', href: '/tools/generator/' },
  { key: 'tools', label: 'Tools', items: toolsDropdown },
  { key: 'guides', label: 'Guides', href: '/guides/' },
  { key: 'support', label: 'Support', items: supportDropdown },
];

// ── Footer groups ────────────────────────────────────────────────────

export const footerGroups: FooterGroup[] = [
  {
    heading: 'Targets',
    items: [
      { label: 'All targets', href: '/targets/' },
      { label: 'Composite boards', href: '/targets/collection/composite-boards/' },
      { label: 'Ceramic & glass', href: '/targets/collection/ceramic-glass/' },
      { label: 'LiDAR & image quality', href: '/targets/collection/lidar-image-quality/' },
      { label: 'Mounts & accessories', href: '/targets/collection/mounts-accessories/' },
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
    heading: 'Support',
    items: [
      { label: 'FAQ', href: '/faq/' },
      { label: 'Shipping, duties & taxes', href: '/shipping/' },
      { label: 'Returns', href: '/returns/' },
      { label: 'Files & downloads', href: '/files/' },
      { label: 'Verify a report', href: '/verify/' },
      { label: 'Contact', href: '/contact/' },
    ],
  },
  {
    heading: 'Company',
    items: [
      { label: 'About', href: '/about/' },
      { label: 'Legal notice', href: '/imprint/' },
      { label: 'Privacy', href: '/privacy/' },
      { label: 'Reviews policy', href: '/reviews-policy/' },
    ],
  },
];
