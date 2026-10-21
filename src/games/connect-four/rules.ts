import { COLS, EXPLORATION_ORDER, ROWS, TOTAL_CELLS } from './constants';
import { cloneConnectFourState, coordToBitIndex, findWinningCells, hasWonBitboard } from './board';
import { ConnectFourMove, ConnectFourState, Player } from './types';

export function getOpponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}

/**
 * Returns legal column moves in center-out exploration order ([3, 2, 4, 1, 5, 0, 6]).
 * This move ordering inherently maximizes Alpha-Beta pruning performance.
 */
export function getLegalMoves(state: ConnectFourState): ConnectFourMove[] {
  if (state.winner !== null) return [];

  const moves: ConnectFourMove[] = [];
  for (const col of EXPLORATION_ORDER) {
    if (state.heights[col] < ROWS) {
      moves.push({
        column: col,
        row: state.heights[col],
      });
    }
  }

  return moves;
}

export function isValidMove(state: ConnectFourState, col: number): boolean {
  if (state.winner !== null) return false;
  return col >= 0 && col < COLS && state.heights[col] < ROWS;
}

export function applyMove(state: ConnectFourState, move: ConnectFourMove): ConnectFourState {
  if (state.winner !== null) {
    throw new Error('Cannot make move in terminal game state');
  }

  const { column, row } = move;
  if (column < 0 || column >= COLS) {
    throw new Error(`Invalid column ${column}: out of bounds [0..${COLS - 1}]`);
  }

  if (state.heights[column] !== row) {
    throw new Error(
      `Invalid move row: expected gravity row ${state.heights[column]}, got ${row}`
    );
  }

  if (row >= ROWS) {
    throw new Error(`Column ${column} is full (capacity ${ROWS})`);
  }

  const nextState = cloneConnectFourState(state);
  const activePlayer = state.turn;
  const playerIdx = activePlayer - 1;

  // Place disc in board array
  nextState.board[column][row] = activePlayer;
  nextState.heights[column] += 1;
  nextState.movesCount += 1;

  // Update bitboard
  const bit = 1n << coordToBitIndex(column, row);
  const updatedBitboard = state.bitboards[playerIdx] | bit;
  nextState.bitboards[playerIdx] = updatedBitboard;

  // Check victory or draw
  if (hasWonBitboard(updatedBitboard)) {
    nextState.winner = activePlayer;
    nextState.winReason = 'connect4';
    nextState.winningCells = findWinningCells(nextState.board, activePlayer) ?? undefined;
  } else if (nextState.movesCount >= TOTAL_CELLS) {
    nextState.winner = 'draw';
    nextState.winReason = 'board_full';
  }

  nextState.turn = getOpponent(activePlayer);
  return nextState;
}
