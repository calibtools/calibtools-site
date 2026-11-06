/**
 * Product FAQ data. Returns handle-specific items if they exist,
 * otherwise shared defaults. Used on product pages and for FAQPage JSON-LD.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

const SHARED: FaqItem[] = [
  {
    question: 'What tolerances can I expect?',
    answer: 'Our aluminium composite targets are printed to ±0.3 mm + 0.2 mm/m (at 20 °C). Our ceramic targets have a ±2 µm target; we will publish the measurement method with the first production boards. Every target is measured before it ships, and you get its inspection report.',
  },
  {
    question: 'What is included with each target?',
    answer: 'Every target comes with the board, a dimensional inspection report, a datasheet PDF, and downloadable config files for OpenCV, Kalibr, ROS 2 and HALCON.',
  },
  {
    question: 'How long does shipping take?',
    answer: 'Targets are made to order and ship from the factory in 2–3 weeks. Tracked express delivery takes 3–6 days to the EU, 3–5 days to the US. Custom sizes may add 1–2 weeks.',
  },
  {
    question: 'Can I order a custom pattern or size?',
    answer: 'Yes. Use the free Pattern Generator to create any grid, then contact us to order it on a rigid substrate. Custom targets use the same material and print process as standard sizes.',
  },
  {
    question: 'Do I need a calibration certificate?',
    answer: 'A certificate is not required for most applications. Every target is measured before it ships. For regulated environments (medical, automotive, aerospace), contact us about accredited calibration options.',
  },
  {
    question: 'Is this compatible with OpenCV?',
    answer: 'Yes. All targets are designed to match OpenCV conventions: origin top-left, x right, y down. Corner IDs follow cv.findChessboardCorners and cv.aruco.CharucoBoard. Config files are generated for OpenCV, Kalibr, ROS 2 and HALCON.',
  },
];

const HANDLE_FAQ: Record<string, FaqItem[]> = {};

/** Get FAQ items for a product handle. Falls back to shared defaults. */
export function getProductFaq(handle: string): FaqItem[] {
  return HANDLE_FAQ[handle] ?? SHARED;
}
