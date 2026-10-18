import { MillTriplet, PointId } from './types';

export const TOTAL_PIECES_PER_PLAYER = 9;
export const BOARD_SIZE = 24;

export interface PointCoord {
  x: number;
  y: number;
}

export const POINT_COORDINATES: Record<PointId, PointCoord> = {
  // Outer square
  0: { x: 60, y: 60 },
  1: { x: 300, y: 60 },
  2: { x: 540, y: 60 },
  3: { x: 540, y: 300 },
  4: { x: 540, y: 540 },
  5: { x: 300, y: 540 },
  6: { x: 60, y: 540 },
  7: { x: 60, y: 300 },

  // Middle square
  8: { x: 135, y: 135 },
  9: { x: 300, y: 135 },
  10: { x: 465, y: 135 },
  11: { x: 465, y: 300 },
  12: { x: 465, y: 465 },
  13: { x: 300, y: 465 },
  14: { x: 135, y: 465 },
  15: { x: 135, y: 300 },

  // Inner square
  16: { x: 210, y: 210 },
  17: { x: 300, y: 210 },
  18: { x: 390, y: 210 },
  19: { x: 390, y: 300 },
  20: { x: 390, y: 390 },
  21: { x: 300, y: 390 },
  22: { x: 210, y: 390 },
  23: { x: 210, y: 300 },
};

export const ADJACENCY_LIST: Record<PointId, PointId[]> = {
  // Outer square
  0: [1, 7],
  1: [0, 2, 9],
  2: [1, 3],
  3: [2, 4, 11],
  4: [3, 5],
  5: [4, 6, 13],
  6: [5, 7],
  7: [6, 0, 15],

  // Middle square
  8: [9, 15],
  9: [8, 10, 1, 17],
  10: [9, 11],
  11: [10, 12, 3, 19],
  12: [11, 13],
  13: [12, 14, 5, 21],
  14: [13, 15],
  15: [14, 8, 7, 23],

  // Inner square
  16: [17, 23],
  17: [16, 18, 9],
  18: [17, 19],
  19: [18, 20, 11],
  20: [19, 21],
  21: [20, 22, 13],
  22: [21, 23],
  23: [22, 16, 15],
};

export const MILLS: readonly MillTriplet[] = [
  // Outer square
  [0, 1, 2],
  [2, 3, 4],
  [4, 5, 6],
  [6, 7, 0],

  // Middle square
  [8, 9, 10],
  [10, 11, 12],
  [12, 13, 14],
  [14, 15, 8],

  // Inner square
  [16, 17, 18],
  [18, 19, 20],
  [20, 21, 22],
  [22, 23, 16],

  // Connecting lines
  [1, 9, 17],
  [3, 11, 19],
  [5, 13, 21],
  [7, 15, 23],
] as const;

// Precomputed mapping from each point to the mills it participates in
export const POINT_TO_MILLS: Record<PointId, MillTriplet[]> = (() => {
  const map: Record<PointId, MillTriplet[]> = {} as Record<PointId, MillTriplet[]>;
  for (let i = 0; i < 24; i++) {
    map[i as PointId] = [];
  }
  for (const mill of MILLS) {
    for (const pt of mill) {
      map[pt].push(mill);
    }
  }
  return map;
})();
