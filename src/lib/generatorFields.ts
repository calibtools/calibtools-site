/**
 * Which size and marker fields the generator form shows for a pattern type, and what the size field is called.
 * A checkerboard has no marker size or dictionary; a marker sheet has no square size. Showing them anyway
 * left fields on the page that changed nothing.
 */
import type { PatternSpec } from './patterns';

export interface GeneratorFields {
  /** Label of the field bound to `square`, or null when the pattern does not use it. */
  sizeLabel: string | null;
  marker: boolean;
  dictionary: boolean;
  startId: boolean;
}

export function generatorFields(type: PatternSpec['type'], aprilFamily?: string): GeneratorFields {
  switch (type) {
    case 'ChArUco':
      return { sizeLabel: 'Square size (mm)', marker: true, dictionary: true, startId: true };
    case 'ArUco grid':
      return { sizeLabel: 'Marker pitch (mm)', marker: true, dictionary: true, startId: true };
    case 'Marker sheet':
      // With an AprilTag family chosen, the family select replaces the ArUco dictionary.
      return { sizeLabel: null, marker: true, dictionary: !aprilFamily, startId: true };
    case 'AprilGrid (Kalibr)':
      return { sizeLabel: 'Tag size (mm)', marker: false, dictionary: false, startId: true };
    case 'Asymmetric circles':
    case 'Symmetric circles':
    case 'HALCON-style dots':
      return { sizeLabel: 'Spacing (mm)', marker: false, dictionary: false, startId: false };
    default: // Checkerboard, PuzzleBoard
      return { sizeLabel: 'Square size (mm)', marker: false, dictionary: false, startId: false };
  }
}
