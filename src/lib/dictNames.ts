/** Dictionaries and tag families the generator and the detection check offer. One list, so the two cannot drift apart. */
export const DICTS = [
  'DICT_4X4_50', 'DICT_4X4_100', 'DICT_4X4_250', 'DICT_5X5_100', 'DICT_5X5_1000', 'DICT_6X6_250', 'DICT_7X7_1000',
  'DICT_ARUCO_ORIGINAL', 'DICT_ARUCO_MIP_36h12',
  'DICT_APRILTAG_36h11',
];

/** AprilTag families with their tag counts. */
export const APRIL_FAMILIES: [family: string, tags: number][] = [['16h5', 30], ['25h9', 35], ['36h11', 587]];
