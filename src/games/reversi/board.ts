import { BOARD_SIZE, TOTAL_SQUARES } from './constants';
import { Cell, EMPTY, ReversiState, SquareCoord, SquareIndex } from './types';

export function createInitialBoard(): Cell[] {
  const board: Cell[] = new Array(TOTAL_SQUARES).fill(EMPTY);

  // Standard Othello Center Setup:
  // d4 (col 3, row 3 -> 27) = White (2)
  // e4 (col 4, row 3 -> 28) = Black (1)
  // d5 (col 3, row 4 -> 35) = Black (1)
  // e5 (col 4, row 4 -> 36) = White (2)
  board[27] = 2;
  board[28] = 1;
  board[35] = 1;
  board[36] = 2;

  return board;
}

export function createInitialReversiState(): ReversiState {
  return {
    board: createInitialBoard(),
    turn: 1, // Black moves first
    blackCount: 2,
    whiteCount: 2,
    movesCount: 0,
    lastMove: null,
    isPass: false,
    consecutivePasses: 0,
    winner: null,
  };
}

export function cloneReversiState(state: ReversiState): ReversiState {
  return {
    board: [...state.board],
    turn: state.turn,
    blackCount: state.blackCount,
    whiteCount: state.whiteCount,
    movesCount: state.movesCount,
    lastMove: state.lastMove
      ? {
          square: state.lastMove.square,
          flippedSquares: state.lastMove.flippedSquares ? [...state.lastMove.flippedSquares] : undefined,
        }
      : null,
    isPass: state.isPass,
    consecutivePasses: state.consecutivePasses,
    winner: state.winner,
    winReason: state.winReason,
  };
}

export function coordFromIndex(idx: SquareIndex): SquareCoord {
  return {
    col: idx % BOARD_SIZE,
    row: Math.floor(idx / BOARD_SIZE),
  };
}

export function indexFromCoord(col: number, row: number): SquareIndex {
  return row * BOARD_SIZE + col;
}

export function isInsideBoard(col: number, row: number): boolean {
  return col >= 0 && col < BOARD_SIZE && row >= 0 && row < BOARD_SIZE;
}

export function countDiscs(board: Cell[]): { black: number; white: number; empty: number } {
  let black = 0;
  let white = 0;
  let empty = 0;

  for (let i = 0; i < TOTAL_SQUARES; i++) {
    const val = board[i];
    if (val === 1) black++;
    else if (val === 2) white++;
    else empty++;
  }

  return { black, white, empty };
}

export function serializeReversiState(state: ReversiState): string {
  // Ultra-compact string: turn:winner:boardString
  return `${state.turn}:${state.winner ?? '_'}:${state.board.join('')}`;
}
