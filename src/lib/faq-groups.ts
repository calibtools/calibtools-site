/**
 * Grouped FAQ data for /faq/. Items are sourced from existing product FAQ
 * and site-wide claims; no new claims are introduced here.
 *
 * Groups: Accuracy & compatibility, Certificate, Ordering & paying, Shipping, Returns.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  id: string;
  heading: string;
  items: FaqItem[];
}

export const faqGroups: FaqGroup[] = [
  {
    id: 'accuracy',
    heading: 'Accuracy & compatibility',
    items: [
      {
        question: 'What tolerances can I expect?',
        answer: 'Composite boards are printed to \u00B10.3\u00A0mm feature accuracy. Ceramic targets achieve \u00B12\u00A0\u00B5m, measured against a DAkkS-calibrated reference. Every target ships with a dimensional inspection report.',
      },
      {
        question: 'Is this compatible with OpenCV?',
        answer: 'Yes. All targets are designed to match OpenCV conventions: origin top-left, x\u00A0right, y\u00A0down. Corner IDs follow cv.findChessboardCorners and cv.aruco.CharucoBoard. Config files are generated for OpenCV, Kalibr, ROS\u00A02 and HALCON.',
      },
      {
        question: 'Can I use a printed PDF for calibration?',
        answer: 'A printed PDF works for quick tests, but paper warps and inkjet dot gain affects geometry. For repeatable, sub-pixel calibration a rigid substrate is recommended. Our free pattern generator produces print-exact PDFs with a 100\u00A0mm scale bar so you can verify the output.',
      },
      {
        question: 'Which pattern should I choose?',
        answer: 'Use the free target selection wizard \u2014 five questions, one recommendation. In general: ChArUco when you need partial-board detection, checkerboard for maximum corner density, AprilGrid for Kalibr and multi-camera rigs.',
      },
    ],
  },
  {
    id: 'certificate',
    heading: 'Certificate',
    items: [
      {
        question: 'Do I need a calibration certificate?',
        answer: 'A certificate is not required for most applications. The included inspection report confirms dimensional accuracy. For regulated environments (medical, automotive, aerospace), the ILAC-MRA calibration certificate from a CNAS-accredited laboratory provides traceable measurement uncertainty.',
      },
      {
        question: 'What is included with each target?',
        answer: 'Every target comes with the board, a dimensional inspection report, a datasheet PDF, and downloadable config files for OpenCV, Kalibr, ROS\u00A02 and HALCON. An ILAC-recognised calibration certificate is available as an add-on.',
      },
    ],
  },
  {
    id: 'ordering',
    heading: 'Ordering & paying',
    items: [
      {
        question: 'Can I order a custom pattern or size?',
        answer: 'Yes. Use the free Pattern Generator to create any grid, then contact us to order it on a rigid substrate. Custom targets use the same material and print process as standard sizes.',
      },
      {
        question: 'How do I request a quote?',
        answer: 'Fill in the form on the Request a Quote page with your pattern, size and quantity. We reply within one business day.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'Checkout is handled by Shopify Payments. We accept Visa, Mastercard, American Express, and PayPal. Purchase orders are available for qualifying institutional orders \u2014 contact us.',
      },
    ],
  },
  {
    id: 'shipping',
    heading: 'Shipping',
    items: [
      {
        question: 'How long does shipping take?',
        answer: 'Targets are made to order and ship from the factory in 2\u20133\u00A0weeks. Tracked express delivery takes 3\u20136\u00A0days to the EU, 3\u20135\u00A0days to the US. Custom sizes may add 1\u20132\u00A0weeks.',
      },
      {
        question: 'Who pays import duties?',
        answer: 'Prices are in EUR and exclude import VAT and duties. Shipments are sent DAP: the carrier collects import VAT (and duty, if any) from the recipient before delivery. Business customers can reclaim import VAT through their normal return.',
      },
    ],
  },
  {
    id: 'returns',
    heading: 'Returns',
    items: [
      {
        question: 'What is your return policy?',
        answer: 'If the target is not flat, not accurate, or not what you ordered, send it back within 30\u00A0days for a full refund or replacement. See the Returns page for details.',
      },
    ],
  },
];
