import { Player } from '../../platform/types';

export type { Player };

export const EMPTY = 0;
export const BLACK_MAN = 1;
export const BLACK_KING = 2;
export const WHITE_MAN = 3;
export const WHITE_KING = 4;

export type PieceValue =
  | typeof EMPTY
  | typeof BLACK_MAN
  | typeof BLACK_KING
  | typeof WHITE_MAN
  | typeof WHITE_KING;

export type SquareIndex = number; // 0..31

export interface SquareCoord {
  index: SquareIndex;
  row: number; // 0..7
  col: number; // 0..7
}

export interface CheckersMove {
  from: SquareIndex;
  to: SquareIndex;
  isJump: boolean;
  path: SquareIndex[]; // [from, ..., to]
  captures: SquareIndex[]; // square indices of captured pieces in order
  crowned?: boolean;
}

export interface CheckersState {
  board: PieceValue[]; // 32 playable dark squares
  turn: Player; // 1 (Black) | 2 (White)
  pliesWithoutCaptureOrManAdvance: number; // for 40-move rule (80 plies)
  history: string[]; // State serialization history for threefold repetition
  winner: Player | 'draw' | null;
  winReason?: 'pieces' | 'trapped' | 'repetition' | 'forty_move_rule';
}
