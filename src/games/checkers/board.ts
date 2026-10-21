import {
  BLACK_KING,
  BLACK_MAN,
  CheckersState,
  EMPTY,
  PieceValue,
  Player,
  WHITE_KING,
  WHITE_MAN,
} from './types';
import { TOTAL_SQUARES } from './constants';

export function getPiecePlayer(piece: PieceValue): Player | null {
  if (piece === BLACK_MAN || piece === BLACK_KING) return 1;
  if (piece === WHITE_MAN || piece === WHITE_KING) return 2;
  return null;
}

export function isKing(piece: PieceValue): boolean {
  return piece === BLACK_KING || piece === WHITE_KING;
}

export function isMan(piece: PieceValue): boolean {
  return piece === BLACK_MAN || piece === WHITE_MAN;
}

export function isBlack(piece: PieceValue): boolean {
  return piece === BLACK_MAN || piece === BLACK_KING;
}

export function isWhite(piece: PieceValue): boolean {
  return piece === WHITE_MAN || piece === WHITE_KING;
}

export function crownPiece(piece: PieceValue): PieceValue {
  if (piece === BLACK_MAN) return BLACK_KING;
  if (piece === WHITE_MAN) return WHITE_KING;
  return piece;
}

export function getOpponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}

export function createInitialCheckersBoard(): PieceValue[] {
  const board: PieceValue[] = new Array(TOTAL_SQUARES).fill(EMPTY);

  // White pieces start on rows 0..2 (indices 0..11)
  for (let i = 0; i < 12; i++) {
    board[i] = WHITE_MAN;
  }

  // Black pieces start on rows 5..7 (indices 20..31)
  for (let i = 20; i < 32; i++) {
    board[i] = BLACK_MAN;
  }

  return board;
}

export function serializeCheckersState(state: CheckersState): string {
  return `${state.board.join(',')}|${state.turn}`;
}

export function createInitialCheckersState(): CheckersState {
  const board = createInitialCheckersBoard();
  const initialState: CheckersState = {
    board,
    turn: 1, // Player 1 (Black) moves first
    pliesWithoutCaptureOrManAdvance: 0,
    history: [],
    winner: null,
  };
  initialState.history = [serializeCheckersState(initialState)];
  return initialState;
}

export function cloneCheckersState(state: CheckersState): CheckersState {
  return {
    board: [...state.board],
    turn: state.turn,
    pliesWithoutCaptureOrManAdvance: state.pliesWithoutCaptureOrManAdvance,
    history: [...state.history],
    winner: state.winner,
    winReason: state.winReason,
  };
}

export interface PieceCounts {
  blackMen: number;
  blackKings: number;
  whiteMen: number;
  whiteKings: number;
  totalBlack: number;
  totalWhite: number;
}

export function countPieces(board: PieceValue[]): PieceCounts {
  let blackMen = 0;
  let blackKings = 0;
  let whiteMen = 0;
  let whiteKings = 0;

  for (let i = 0; i < board.length; i++) {
    const piece = board[i];
    if (piece === BLACK_MAN) blackMen++;
    else if (piece === BLACK_KING) blackKings++;
    else if (piece === WHITE_MAN) whiteMen++;
    else if (piece === WHITE_KING) whiteKings++;
  }

  return {
    blackMen,
    blackKings,
    whiteMen,
    whiteKings,
    totalBlack: blackMen + blackKings,
    totalWhite: whiteMen + whiteKings,
  };
}
