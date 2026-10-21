export type Player = 1 | 2;

export const EMPTY = 0;
export type Cell = 0 | 1 | 2;

export interface CellCoord {
  column: number;
  row: number;
}

export interface ConnectFourMove {
  column: number;
  row: number;
}

export interface ConnectFourState {
  /** 7 columns x 6 rows: board[col][row], row 0 is bottom, row 5 is top */
  board: Cell[][];
  /** Array of 7 integers representing current number of discs in each column (0..6) */
  heights: number[];
  /** 64-bit bitboards for [Player 1 (Red), Player 2 (Yellow)] using 7x7 sentinel layout */
  bitboards: [bigint, bigint];
  /** Active player: 1 (Red) or 2 (Yellow) */
  turn: Player;
  /** Total moves played so far (0..42) */
  movesCount: number;
  /** Terminal status: 1 | 2 | 'draw' | null */
  winner: Player | 'draw' | null;
  winReason?: 'connect4' | 'board_full';
  winningCells?: CellCoord[];
}
