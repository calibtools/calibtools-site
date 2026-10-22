/**
 * Selection wizard — recommends a calibration pattern based on user answers.
 * Pure logic, no DOM.
 */

export type Application = 'robotics' | 'industrial' | 'automotive' | 'drone' | 'medical' | 'research' | 'other';
export type AccuracyNeed = 'high' | 'medium' | 'low';
export type CameraType = 'mono' | 'stereo' | 'fisheye' | 'multi';
export type Environment = 'indoor' | 'outdoor' | 'both';
export type ToolChain = 'opencv' | 'kalibr' | 'ros' | 'halcon' | 'matlab' | 'other';
export type Material = 'paper' | 'aluminum' | 'glass' | 'acrylic';

export interface WizardAnswers {
  application: Application;
  accuracy: AccuracyNeed;
  camera: CameraType;
  environment: Environment;
  toolchain: ToolChain;
  sensorW?: number;    // mm
  sensorH?: number;    // mm
  focal?: number;      // mm
  distance?: number;   // mm
}

export interface Recommendation {
  pattern: string;
  rows: number;
  cols: number;
  square: number;       // mm
  marker: number;       // mm
  dict: string;
  paper: string;
  material: Material;
  reasoning: string[];
}

/**
 * Recommend a calibration pattern based on wizard answers.
 *
 * Decision tree:
 * 1. Toolchain determines base pattern (Kalibr → AprilGrid, HALCON → dots, etc.)
 * 2. Camera type refines (fisheye needs larger FOV coverage → bigger board or smaller squares)
 * 3. Accuracy determines material and size
 * 4. Environment determines material
 */
export function recommend(a: WizardAnswers): Recommendation {
  const reasoning: string[] = [];
  let pattern = 'ChArUco';
  let rows = 7;
  let cols = 10;
  let square = 25;
  let marker = 18;
  let dict = 'DICT_6X6_250';
  let paper: string = 'A4';
  let material: Material = 'paper';

  // 1. Toolchain → base pattern
  if (a.toolchain === 'kalibr') {
    pattern = 'AprilGrid (Kalibr)';
    dict = 'DICT_APRILTAG_36h11';
    rows = 6;
    cols = 6;
    reasoning.push('Kalibr works best with AprilGrid targets and the 36h11 tag family.');
  } else if (a.toolchain === 'halcon') {
    pattern = 'HALCON-style dots';
    rows = 7;
    cols = 11;
    reasoning.push('HALCON expects its own dot pattern format for find_caltab.');
  } else if (a.toolchain === 'opencv' || a.toolchain === 'ros') {
    pattern = 'ChArUco';
    reasoning.push('ChArUco boards give sub-pixel corner accuracy and work with partial occlusion.');
  } else if (a.toolchain === 'matlab') {
    pattern = 'Checkerboard';
    reasoning.push('MATLAB Camera Calibrator expects a standard checkerboard.');
  } else {
    pattern = 'ChArUco';
    reasoning.push('ChArUco is the most versatile pattern — works with OpenCV, ROS, and most toolchains.');
  }

  // 2. Camera type adjustments
  if (a.camera === 'fisheye') {
    rows = Math.max(rows, 8);
    cols = Math.max(cols, 11);
    square = 20;
    marker = 14;
    paper = 'A3';
    reasoning.push('Fisheye lenses need a larger target that fills the wide FOV. Using A3 with smaller squares.');
  } else if (a.camera === 'stereo' || a.camera === 'multi') {
    paper = 'A3';
    reasoning.push('Stereo/multi-camera setups benefit from a larger target visible to all cameras simultaneously.');
  }

  // 3. Accuracy → size and material
  if (a.accuracy === 'high') {
    material = 'aluminum';
    if (square > 20) square = 20;
    marker = Math.round(square * 0.7);
    reasoning.push('High accuracy requires a rigid, dimensionally stable target. Aluminum composite recommended.');
  } else if (a.accuracy === 'medium') {
    material = 'acrylic';
    reasoning.push('Medium accuracy: acrylic or foam board gives good flatness at lower cost.');
  } else {
    material = 'paper';
    reasoning.push('For quick tests or low-accuracy needs, a printed paper target is fine.');
  }

  // 4. Environment → material override
  if (a.environment === 'outdoor' || a.environment === 'both') {
    if (material === 'paper') {
      material = 'acrylic';
      reasoning.push('Outdoor use requires a weather-resistant material. Upgraded to acrylic.');
    }
    reasoning.push('Consider matte finish to avoid glare in outdoor lighting.');
  }

  // 5. Distance-based square size (if sensor info provided)
  if (a.sensorW && a.focal && a.distance) {
    const coverage = a.distance * a.sensorW / a.focal;
    const idealSquare = Math.round(coverage / cols / 2);
    if (idealSquare >= 5 && idealSquare <= 100) {
      square = idealSquare;
      marker = Math.round(square * 0.72);
      reasoning.push(`Based on your camera setup, ${square} mm squares give good pixel coverage at ${a.distance} mm.`);
    }
  }

  // Ensure marker < square
  if (marker >= square) marker = Math.round(square * 0.72);

  return { pattern, rows, cols, square, marker, dict, paper, material, reasoning };
}

/** Material descriptions for display. */
export const MATERIALS: Record<Material, { label: string; description: string }> = {
  paper: { label: 'Printed paper', description: 'Tape to a flat surface. Replace when worn.' },
  acrylic: { label: 'Acrylic / foam board', description: 'Lightweight, flat, and moisture-resistant.' },
  aluminum: { label: 'Aluminum composite', description: 'Best flatness (±0.1 mm) and durability. Ships ready to use.' },
  glass: { label: 'Glass plate', description: 'Laboratory-grade flatness. Fragile but precise.' },
};
