/**
 * Single source of truth for tool metadata.
 * Imported by tools/index.astro, index.astro, and ToolTabs.astro.
 * A tool is `live: true` only when its page renders an interactive island.
 */
export interface ToolDef {
  key: string;
  href: string;
  title: string;
  body: string;
  cta: string;
  live: boolean;
}

export const tools: ToolDef[] = [
  { key: 'generator', href: '/tools/generator/', title: 'Pattern generator', body: 'Checkerboard, ChArUco, AprilGrid, circles. Print-exact PDF plus OpenCV, Kalibr and ROS config files.', cta: 'Generate', live: true },
  { key: 'fov', href: '/tools/fov/', title: 'FOV & resolution calculator', body: 'Sensor, lens and working distance in — field of view, mm per pixel and target size out.', cta: 'Calculate', live: true },
  { key: 'wizard', href: '/tools/wizard/', title: 'Target selection wizard', body: 'Five questions, one recommendation: pattern, size, material.', cta: 'Start', live: true },
  { key: 'convert', href: '/tools/convert/', title: 'Format converter', body: 'OpenCV ↔ ROS camera_info ↔ Kalibr ↔ HALCON ↔ COLMAP intrinsics.', cta: 'Convert', live: true },
  { key: 'check', href: '/tools/check/', title: 'Detection check', body: 'Upload a photo of your board and see what the detector finds.', cta: 'Check', live: true },
  { key: 'quality', href: '/tools/quality/', title: 'Calibration quality analyzer', body: 'Coverage heatmap, reprojection error, parameter correlation — in your browser.', cta: 'Analyze', live: true },
  { key: 'capture', href: '/tools/capture/', title: 'Capture assistant', body: 'Guided calibration image capture with 15 poses for optimal coverage.', cta: 'Capture', live: true },
];
