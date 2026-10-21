export const COLS = 7;
export const ROWS = 6;
export const TOTAL_CELLS = 42;
export const BITS_PER_COL = 7; // 6 playable rows + 1 sentinel row

/** Exploration order from center to edges for Alpha-Beta move ordering */
export const EXPLORATION_ORDER: readonly number[] = [3, 2, 4, 1, 5, 0, 6];

export const CENTER_COLUMN = 3;

export const PLAYER_NAMES = {
  1: 'Red',
  2: 'Yellow',
} as const;

export const PLAYER_COLORS = {
  1: '#ef4444',
  2: '#fbbf24',
} as const;
