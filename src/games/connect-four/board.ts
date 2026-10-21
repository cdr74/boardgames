import { BITS_PER_COL, COLS, ROWS } from './constants';
import { Cell, CellCoord, ConnectFourState, EMPTY, Player } from './types';

export function createInitialBoard(): Cell[][] {
  const board: Cell[][] = [];
  for (let c = 0; c < COLS; c++) {
    const col: Cell[] = [];
    for (let r = 0; r < ROWS; r++) {
      col.push(EMPTY);
    }
    board.push(col);
  }
  return board;
}

export function createInitialHeights(): number[] {
  return [0, 0, 0, 0, 0, 0, 0];
}

export function createInitialBitboards(): [bigint, bigint] {
  return [0n, 0n];
}

export function createInitialConnectFourState(): ConnectFourState {
  return {
    board: createInitialBoard(),
    heights: createInitialHeights(),
    bitboards: createInitialBitboards(),
    turn: 1,
    movesCount: 0,
    winner: null,
  };
}

export function cloneConnectFourState(state: ConnectFourState): ConnectFourState {
  const clonedBoard: Cell[][] = [];
  for (let c = 0; c < COLS; c++) {
    clonedBoard.push([...state.board[c]]);
  }

  return {
    board: clonedBoard,
    heights: [...state.heights],
    bitboards: [state.bitboards[0], state.bitboards[1]],
    turn: state.turn,
    movesCount: state.movesCount,
    winner: state.winner,
    winReason: state.winReason,
    winningCells: state.winningCells ? state.winningCells.map((cell) => ({ ...cell })) : undefined,
  };
}

/**
 * Calculates the bitboard index for slot (col, row).
 * Formula: col * 7 + row.
 */
export function coordToBitIndex(col: number, row: number): bigint {
  return BigInt(col * BITS_PER_COL + row);
}

/**
 * Checks whether a given player's bitboard contains a 4-in-a-row alignment in O(1).
 * Uses bit-shift operations with a 7x7 grid layout (row 6 is sentinel).
 */
export function hasWonBitboard(bb: bigint): boolean {
  // 1. Horizontal check: col stride is 7
  let m = bb & (bb >> 7n);
  if ((m & (m >> 14n)) !== 0n) return true;

  // 2. Vertical check: row stride is 1
  m = bb & (bb >> 1n);
  if ((m & (m >> 2n)) !== 0n) return true;

  // 3. Diagonal \ check: down-right stride is 6 (col + 1, row - 1)
  m = bb & (bb >> 6n);
  if ((m & (m >> 12n)) !== 0n) return true;

  // 4. Diagonal / check: up-right stride is 8 (col + 1, row + 1)
  m = bb & (bb >> 8n);
  if ((m & (m >> 16n)) !== 0n) return true;

  return false;
}

/**
 * Finds the 4 winning cell coordinates for UI rendering and highlights.
 */
export function findWinningCells(board: Cell[][], player: Player): CellCoord[] | null {
  // 1. Horizontal (stride col + 1, row 0)
  for (let c = 0; c <= COLS - 4; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (
        board[c][r] === player &&
        board[c + 1][r] === player &&
        board[c + 2][r] === player &&
        board[c + 3][r] === player
      ) {
        return [
          { column: c, row: r },
          { column: c + 1, row: r },
          { column: c + 2, row: r },
          { column: c + 3, row: r },
        ];
      }
    }
  }

  // 2. Vertical (stride col 0, row + 1)
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      if (
        board[c][r] === player &&
        board[c][r + 1] === player &&
        board[c][r + 2] === player &&
        board[c][r + 3] === player
      ) {
        return [
          { column: c, row: r },
          { column: c, row: r + 1 },
          { column: c, row: r + 2 },
          { column: c, row: r + 3 },
        ];
      }
    }
  }

  // 3. Diagonal / (stride col + 1, row + 1)
  for (let c = 0; c <= COLS - 4; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      if (
        board[c][r] === player &&
        board[c + 1][r + 1] === player &&
        board[c + 2][r + 2] === player &&
        board[c + 3][r + 3] === player
      ) {
        return [
          { column: c, row: r },
          { column: c + 1, row: r + 1 },
          { column: c + 2, row: r + 2 },
          { column: c + 3, row: r + 3 },
        ];
      }
    }
  }

  // 4. Diagonal \ (stride col + 1, row - 1)
  for (let c = 0; c <= COLS - 4; c++) {
    for (let r = 3; r < ROWS; r++) {
      if (
        board[c][r] === player &&
        board[c + 1][r - 1] === player &&
        board[c + 2][r - 2] === player &&
        board[c + 3][r - 3] === player
      ) {
        return [
          { column: c, row: r },
          { column: c + 1, row: r - 1 },
          { column: c + 2, row: r - 2 },
          { column: c + 3, row: r - 3 },
        ];
      }
    }
  }

  return null;
}

export function serializeConnectFourState(state: ConnectFourState): string {
  return `${state.turn}:${state.bitboards[0].toString(16)}:${state.bitboards[1].toString(16)}`;
}
