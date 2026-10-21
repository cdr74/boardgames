export type Player = 1 | 2; // 1 = Black, 2 = White

export const EMPTY = 0;
export type Cell = 0 | 1 | 2;

export type SquareIndex = number; // 0..63

export interface SquareCoord {
  col: number;
  row: number;
}

export interface ReversiMove {
  square: SquareIndex;
  flippedSquares?: SquareIndex[];
}

export interface ReversiState {
  /** 64 cells, row-major (index = row * 8 + col) */
  board: Cell[];
  /** Active player: 1 (Black) or 2 (White) */
  turn: Player;
  /** Current disc counts */
  blackCount: number;
  whiteCount: number;
  /** Total moves made so far */
  movesCount: number;
  /** Last move executed, or null on initial state */
  lastMove: ReversiMove | null;
  /** True if the previous turn resulted in an automatic pass */
  isPass: boolean;
  /** Number of consecutive passes (2 consecutive passes = game over) */
  consecutivePasses: number;
  /** Terminal status: 1 | 2 | 'draw' | null */
  winner: Player | 'draw' | null;
  winReason?: 'board_full' | 'no_moves' | 'wipeout';
}
