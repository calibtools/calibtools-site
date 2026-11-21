/**
 * Single source of truth for Plumbline, the Calib.Tools desktop calibration software.
 * Read by the header navigation and /plumbline/. Every page that mentions Plumbline reads its
 * status from here, so the wording switches in one place when the first version ships.
 *
 * Status 2026-11-22: not released yet. `released` stays empty until a version
 * ships; `planned` is the scope of the first public version (feature definition 2026-11-21 §6).
 */
import { CONTACT_EMAIL } from './claims';

export type SoftwareStatus = 'unreleased' | 'released';

export interface SoftwareDef {
  name: string;
  href: string;
  status: SoftwareStatus;
  /** Version string of the latest release; null before the first one. */
  version: string | null;
  platforms: readonly string[];
  license: string;
  /** Features that a released version has. Empty until the first release. */
  released: readonly string[];
  /** Scope of the first public version, shown as planned. */
  planned: readonly string[];
  /** Where visitors ask to be told about the first release, until the sign-up form exists. */
  notifyEmail: string;
}

export const software: SoftwareDef = {
  name: 'Plumbline',
  href: '/plumbline/',
  status: 'unreleased',
  version: null,
  platforms: ['Windows', 'macOS', 'Linux'],
  license: 'MIT',
  released: [],
  planned: [
    'Single-camera calibration with the standard OpenCV camera model (optional k3, tangential, rational and thin-prism terms)',
    'ChArUco and checkerboard detection; pick a Calib.Tools part number and the board parameters fill in',
    'Reprojection error for every image, a corner coverage map, and recalibration after removing bad images',
    'Export to OpenCV YAML and JSON, and to ROS camera_info',
    'Runs on your computer: images are not uploaded',
  ],
  notifyEmail: CONTACT_EMAIL,
};

/** Subject line for the first-release notification email (mailto link on /plumbline/). */
export const NOTIFY_SUBJECT = 'Plumbline first release';
