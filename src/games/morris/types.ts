import { Player } from '../../platform/types';

export type { Player };
export const EMPTY = 0;
export type PointState = Player | typeof EMPTY;

export type PointId =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
  | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23;

export type Phase = 'placement' | 'movement' | 'flying';

export interface Move {
  type: 'place' | 'slide' | 'fly';
  from?: PointId;
  to: PointId;
  capture?: PointId;
}

export interface GameState {
  board: PointState[]; // Array of 24 points
  turn: Player;
  whitePiecesInHand: number;
  blackPiecesInHand: number;
  whitePiecesOnBoard: number;
  blackPiecesOnBoard: number;
  pendingCapture: boolean;
  captureMoveBase?: { type: 'place' | 'slide' | 'fly'; from?: PointId; to: PointId };
  moveCountWithoutCapture: number;
  history: string[]; // State serialization history for threefold repetition
  winner: Player | 'draw' | null;
  winReason?: 'pieces' | 'trapped' | 'repetition' | 'fifty_move_rule';
  flyingEnabled: boolean;
}

export type MillTriplet = readonly [PointId, PointId, PointId];
