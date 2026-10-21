import { Player, SquareCoord, SquareIndex } from './types';

export const TOTAL_SQUARES = 32;
export const BOARD_SIZE = 8;
export const PIECES_PER_PLAYER = 12;

export const enum Direction {
  UP_LEFT = 0,
  UP_RIGHT = 1,
  DOWN_LEFT = 2,
  DOWN_RIGHT = 3,
}

export const DIRECTION_OFFSETS: Record<Direction, { dRow: number; dCol: number }> = {
  [Direction.UP_LEFT]: { dRow: -1, dCol: -1 },
  [Direction.UP_RIGHT]: { dRow: -1, dCol: +1 },
  [Direction.DOWN_LEFT]: { dRow: +1, dCol: -1 },
  [Direction.DOWN_RIGHT]: { dRow: +1, dCol: +1 },
};

export const BLACK_MAN_DIRECTIONS: readonly Direction[] = [Direction.UP_LEFT, Direction.UP_RIGHT];
export const WHITE_MAN_DIRECTIONS: readonly Direction[] = [Direction.DOWN_LEFT, Direction.DOWN_RIGHT];
export const KING_DIRECTIONS: readonly Direction[] = [
  Direction.UP_LEFT,
  Direction.UP_RIGHT,
  Direction.DOWN_LEFT,
  Direction.DOWN_RIGHT,
];

// Precompute coordinate table for indices 0..31
export const SQUARE_COORDS: readonly SquareCoord[] = Object.freeze(
  Array.from({ length: TOTAL_SQUARES }, (_, index) => {
    const row = Math.floor(index / 4);
    const col = row % 2 === 0 ? (index % 4) * 2 + 1 : (index % 4) * 2;
    return { index, row, col };
  })
);

export function coordFromIndex(index: SquareIndex): SquareCoord {
  return SQUARE_COORDS[index];
}

export function indexFromCoord(row: number, col: number): SquareIndex | -1 {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return -1;
  }
  if ((row + col) % 2 === 0) {
    // Light squares are not playable
    return -1;
  }
  return row * 4 + Math.floor(col / 2);
}

export interface StepNeighbor {
  dir: Direction;
  to: SquareIndex;
}

export interface JumpNeighbor {
  dir: Direction;
  over: SquareIndex;
  to: SquareIndex;
}

// Precomputed neighbor tables
export const STEP_NEIGHBORS: readonly (readonly StepNeighbor[])[] = Object.freeze(
  Array.from({ length: TOTAL_SQUARES }, (_, index) => {
    const { row, col } = SQUARE_COORDS[index];
    const neighbors: StepNeighbor[] = [];

    const dirs = [Direction.UP_LEFT, Direction.UP_RIGHT, Direction.DOWN_LEFT, Direction.DOWN_RIGHT];
    for (const dir of dirs) {
      const { dRow, dCol } = DIRECTION_OFFSETS[dir];
      const targetRow = row + dRow;
      const targetCol = col + dCol;
      const toIndex = indexFromCoord(targetRow, targetCol);
      if (toIndex !== -1) {
        neighbors.push({ dir, to: toIndex });
      }
    }
    return Object.freeze(neighbors);
  })
);

export const JUMP_NEIGHBORS: readonly (readonly JumpNeighbor[])[] = Object.freeze(
  Array.from({ length: TOTAL_SQUARES }, (_, index) => {
    const { row, col } = SQUARE_COORDS[index];
    const jumps: JumpNeighbor[] = [];

    const dirs = [Direction.UP_LEFT, Direction.UP_RIGHT, Direction.DOWN_LEFT, Direction.DOWN_RIGHT];
    for (const dir of dirs) {
      const { dRow, dCol } = DIRECTION_OFFSETS[dir];
      const overRow = row + dRow;
      const overCol = col + dCol;
      const toRow = row + dRow * 2;
      const toCol = col + dCol * 2;

      const overIndex = indexFromCoord(overRow, overCol);
      const toIndex = indexFromCoord(toRow, toCol);

      if (overIndex !== -1 && toIndex !== -1) {
        jumps.push({ dir, over: overIndex, to: toIndex });
      }
    }
    return Object.freeze(jumps);
  })
);

export function isKingRow(player: Player, index: SquareIndex): boolean {
  if (player === 1) {
    // Black king row is row 0 (indices 0..3)
    return index >= 0 && index <= 3;
  } else {
    // White king row is row 7 (indices 28..31)
    return index >= 28 && index <= 31;
  }
}
