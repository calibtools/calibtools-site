/**
 * Grouped FAQ data for /faq/. Every answer interpolates claims.ts constants
 * so numbers stay consistent across pages.
 *
 * Groups: Accuracy & compatibility, Inspection & certificates,
 *         Ordering & paying, Shipping & duties, Returns.
 */

import {
  COMPOSITE_TOLERANCE,
  COMPOSITE_FLATNESS,
  CERAMIC_ACCURACY,
  CERAMIC_CTE_UM_PER_M_K,
  COMPOSITE_CTE_UM_PER_M_K,
  INSPECTION_CLAIM,
  LEAD_TIME_WEEKS,
  RETURN_WINDOW_DAYS,
  CONTACT_EMAIL,
  SHIP_COUNTRY_COUNT,
} from './claims';

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
        answer: `Aluminum composite: ${COMPOSITE_TOLERANCE} feature position at 20\u00A0\u00B0C, flatness ${COMPOSITE_FLATNESS}. Ceramic: ${CERAMIC_ACCURACY} is our target, and we\u2019ll publish the measurement method with the first production boards. Each datasheet lists the full spec.`,
      },
      {
        question: 'Composite or ceramic \u2014 which do I need?',
        answer: `Composite is light, rigid and affordable in large sizes \u2014 good for robotics, camera\u2013lidar and lab work at a few tenths of a millimeter. Ceramic is for small fields of view and sub-pixel work: it barely moves with temperature (${CERAMIC_CTE_UM_PER_M_K} vs ${COMPOSITE_CTE_UM_PER_M_K}\u00A0\u00B5m/(m\u00B7K)) and stays flatter.`,
      },
      {
        question: 'Is it compatible with OpenCV?',
        answer: 'Yes. Patterns follow OpenCV conventions: origin top-left, x\u00A0right, y\u00A0down. ChArUco boards use the standard ArUco dictionaries, so cv.aruco.CharucoBoard detects them as they are. Our free tools export config files for OpenCV, Kalibr, ROS\u00A02 and HALCON.',
      },
      {
        question: 'Which marker IDs are on my board?',
        answer: 'The ID range is shown when you choose your board and printed on its label. Ordering several boards of the same size? Each one gets the next block of IDs, so markers never repeat across a multi-board rig.',
      },
      {
        question: 'Can I just print a PDF?',
        answer: 'For a quick test, yes. Paper warps and inkjet dot gain shifts the geometry, so for repeatable sub-pixel results use a rigid target. Our free pattern generator makes print-exact PDFs with a 100\u00A0mm scale bar, so you can check the print with a ruler.',
      },
      {
        question: 'Which pattern should I choose?',
        answer: 'Try the free target selection wizard: five questions, one recommendation. Short version: ChArUco if the board won\u2019t always be fully in view, checkerboard for the densest corners, AprilGrid for Kalibr and multi-camera rigs.',
      },
    ],
  },
  {
    id: 'inspection',
    heading: 'Inspection & certificates',
    items: [
      {
        question: 'How is each target checked?',
        answer: `${INSPECTION_CLAIM}. Tolerances on the datasheet are what we measure against.`,
      },
      {
        question: 'Do you offer calibration certificates?',
        answer: 'A certificate is not required for most applications. Every target is measured before it ships. For regulated environments (medical, automotive, aerospace), contact us about third-party calibration certificates; lead time depends on the accredited lab.',
      },
      {
        question: 'What\u2019s in the box?',
        answer: 'The target, in a clean bag, held between two foam layers in a rigid mailer box. Datasheets are on the Files page; config files come from our free tools.',
      },
    ],
  },
  {
    id: 'ordering',
    heading: 'Ordering & paying',
    items: [
      {
        question: 'Can I order a custom pattern or size?',
        answer: 'Yes. Build the pattern in the free generator, then request a quote. Custom targets use the same materials and print process as our standard sizes.',
      },
      {
        question: 'How do I get a quote?',
        answer: `Use the Request a quote form with your pattern, size and quantity. We reply within one business day.`,
      },
      {
        question: 'How can I pay?',
        answer: `Visa, Mastercard and American Express, plus Shop Pay, Apple Pay and Google Pay, at Shopify checkout. Prices are in USD. Universities and companies can pay by purchase order on qualifying orders \u2014 mention it in your quote request.`,
      },
    ],
  },
  {
    id: 'shipping',
    heading: 'Shipping & duties',
    items: [
      {
        question: 'How long until it arrives?',
        answer: `Targets are made to order: ${LEAD_TIME_WEEKS} to produce and dispatch, then tracked express. Transit is about 3\u20135\u00A0business days to the US, 3\u20136 to the EU and UK, and 5\u201310 elsewhere. Custom sizes can add 1\u20132\u00A0weeks.`,
      },
      {
        question: 'Where do you ship?',
        answer: `To ${SHIP_COUNTRY_COUNT} countries and territories, including the US, Canada, the EU, the UK, Switzerland, Norway, Japan, South Korea, Australia, New Zealand and Singapore. If your country is listed at checkout, we ship there.`,
      },
      {
        question: 'Who pays import duties and VAT?',
        answer: 'You do, on delivery. Prices exclude import VAT and duties, and we ship DAP: the carrier collects them before handing over the parcel. EU and UK businesses can usually reclaim the import VAT. The US charges duty on all imported parcels, whatever the value.',
      },
    ],
  },
  {
    id: 'returns',
    heading: 'Returns',
    items: [
      {
        question: 'What\u2019s your return policy?',
        answer: `Standard targets can come back within ${RETURN_WINDOW_DAYS} days of delivery \u2014 email us for a return number first. If we got it wrong, we pay return shipping. Unopened targets can still come back up to 120\u00A0days, less a restocking fee. Defects are covered for one year. Details on the Returns page.`,
      },
    ],
  },
];
