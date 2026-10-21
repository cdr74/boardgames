export const BOARD_SIZE = 8;
export const TOTAL_SQUARES = 64;

/**
 * 8 Directions in (deltaCol, deltaRow) order:
 * [NW, N, NE, W, E, SW, S, SE]
 */
export const DIRECTIONS: readonly [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/** Four corners of the 8x8 grid */
export const CORNERS: readonly number[] = [0, 7, 56, 63];

/** Danger squares diagonally adjacent to corners ("X-Squares") */
export const X_SQUARES: readonly number[] = [9, 14, 49, 54];

/** Danger squares orthogonally adjacent to corners ("C-Squares") */
export const C_SQUARES: readonly number[] = [1, 8, 6, 15, 48, 57, 55, 62];

/**
 * Four intersection dot coordinates for classic Othello felt board presentation:
 * (2,2), (6,2), (2,6), (6,6)
 */
export const STAR_DOTS: readonly { col: number; row: number }[] = [
  { col: 2, row: 2 },
  { col: 6, row: 2 },
  { col: 2, row: 6 },
  { col: 6, row: 6 },
];

export const PLAYER_NAMES = {
  1: 'Black',
  2: 'White',
} as const;

export const PLAYER_COLORS = {
  1: '#0f172a',
  2: '#f8fafc',
} as const;
