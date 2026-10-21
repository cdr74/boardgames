import { COLS, ROWS } from './constants';
import { getOpponent } from './rules';
import { CellCoord, ConnectFourMove, ConnectFourState, Player } from './types';

export type Window4 = readonly [CellCoord, CellCoord, CellCoord, CellCoord];

/**
 * Precomputed 69 four-cell windows on the 7x6 board.
 * - 24 Horizontal windows
 * - 21 Vertical windows
 * - 12 Diagonal / windows
 * - 12 Diagonal \ windows
 */
export const ALL_WINDOWS: readonly Window4[] = (() => {
  const windows: Window4[] = [];

  // 1. Horizontal (24 windows)
  for (let c = 0; c <= COLS - 4; c++) {
    for (let r = 0; r < ROWS; r++) {
      windows.push([
        { column: c, row: r },
        { column: c + 1, row: r },
        { column: c + 2, row: r },
        { column: c + 3, row: r },
      ]);
    }
  }

  // 2. Vertical (21 windows)
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      windows.push([
        { column: c, row: r },
        { column: c, row: r + 1 },
        { column: c, row: r + 2 },
        { column: c, row: r + 3 },
      ]);
    }
  }

  // 3. Diagonal / (12 windows)
  for (let c = 0; c <= COLS - 4; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      windows.push([
        { column: c, row: r },
        { column: c + 1, row: r + 1 },
        { column: c + 2, row: r + 2 },
        { column: c + 3, row: r + 3 },
      ]);
    }
  }

  // 4. Diagonal \ (12 windows)
  for (let c = 0; c <= COLS - 4; c++) {
    for (let r = 3; r < ROWS; r++) {
      windows.push([
        { column: c, row: r },
        { column: c + 1, row: r - 1 },
        { column: c + 2, row: r - 2 },
        { column: c + 3, row: r - 3 },
      ]);
    }
  }

  return windows;
})();

const COLUMN_WEIGHTS = [0, 1, 3, 6, 3, 1, 0];

/**
 * Evaluates the board state from the perspective of `perspectivePlayer`.
 * Higher positive scores favor perspectivePlayer; negative favor the opponent.
 */
export function evaluateConnectFourState(
  state: ConnectFourState,
  perspectivePlayer: Player
): number {
  const opponent = getOpponent(perspectivePlayer);

  // Terminal states
  if (state.winner !== null) {
    if (state.winner === perspectivePlayer) {
      return 100000 - state.movesCount;
    }
    if (state.winner === opponent) {
      return -(100000 - state.movesCount);
    }
    return 0; // Draw
  }

  let totalScore = 0;

  // 1. Positional Center Control Score
  for (let c = 0; c < COLS; c++) {
    const weight = COLUMN_WEIGHTS[c];
    if (weight === 0) continue;
    const colHeight = state.heights[c];
    for (let r = 0; r < colHeight; r++) {
      const cell = state.board[c][r];
      if (cell === perspectivePlayer) {
        totalScore += weight;
      } else if (cell === opponent) {
        totalScore -= weight;
      }
    }
  }

  // 2. 69 Four-Cell Window Alignment & Threat Analysis
  const board = state.board;
  const heights = state.heights;

  for (let w = 0; w < ALL_WINDOWS.length; w++) {
    const win = ALL_WINDOWS[w];

    let pCount = 0;
    let oCount = 0;
    let emptyC = -1;
    let emptyR = -1;

    for (let i = 0; i < 4; i++) {
      const coord = win[i];
      const cell = board[coord.column][coord.row];
      if (cell === perspectivePlayer) {
        pCount++;
      } else if (cell === opponent) {
        oCount++;
      } else {
        emptyC = coord.column;
        emptyR = coord.row;
      }
    }

    // If both players have discs in this window, it's blocked (0 pts)
    if (pCount > 0 && oCount > 0) continue;

    if (pCount === 4) {
      return 100000 - state.movesCount;
    }
    if (oCount === 4) {
      return -(100000 - state.movesCount);
    }

    if (pCount === 3) {
      // Direct immediate threat if empty slot is playable on next turn
      if (emptyC !== -1 && heights[emptyC] === emptyR) {
        totalScore += 200;
      } else {
        totalScore += 50;
      }
    } else if (pCount === 2) {
      totalScore += 10;
    } else if (pCount === 1) {
      totalScore += 1;
    }

    if (oCount === 3) {
      if (emptyC !== -1 && heights[emptyC] === emptyR) {
        totalScore -= 200;
      } else {
        totalScore -= 50;
      }
    } else if (oCount === 2) {
      totalScore -= 10;
    } else if (oCount === 1) {
      totalScore -= 1;
    }
  }

  return totalScore;
}

/**
 * Checks whether a move is tactical:
 * - Direct winning move for active player
 * - Direct blocking move preventing immediate opponent victory
 */
export function isConnectFourTacticalMove(
  move: ConnectFourMove,
  state: ConnectFourState
): boolean {
  const { column, row } = move;
  const activePlayer = state.turn;
  const opponent = getOpponent(activePlayer);

  // Check if active player wins by placing here
  // Check horizontal, vertical, diagonal lines passing through (column, row)
  for (let w = 0; w < ALL_WINDOWS.length; w++) {
    const win = ALL_WINDOWS[w];
    let containsMove = false;
    let pCount = 0;
    let oCount = 0;

    for (let i = 0; i < 4; i++) {
      const c = win[i];
      if (c.column === column && c.row === row) {
        containsMove = true;
      } else {
        const piece = state.board[c.column][c.row];
        if (piece === activePlayer) pCount++;
        else if (piece === opponent) oCount++;
      }
    }

    if (containsMove) {
      // If 3 pieces belong to activePlayer, placing here completes 4-in-a-row!
      if (pCount === 3 && oCount === 0) return true;
      // If 3 pieces belong to opponent, placing here blocks opponent's 4-in-a-row!
      if (oCount === 3 && pCount === 0) return true;
    }
  }

  return false;
}
