import { Player } from '../../platform/types';
import { getOpponent, getPiecePlayer, isKing } from './board';
import { SQUARE_COORDS, TOTAL_SQUARES } from './constants';
import { getLegalMovesForPlayer } from './rules';
import { CheckersState, PieceValue, SquareIndex } from './types';

// Central 4x4 squares: 9, 10, 13, 14, 17, 18, 21, 22
const CENTER_SQUARES = new Set<SquareIndex>([9, 10, 13, 14, 17, 18, 21, 22]);

export const MATERIAL_MAN_WEIGHT = 100;
export const MATERIAL_KING_WEIGHT = 175;
export const RANK_ADVANCEMENT_WEIGHT = 3;
export const CENTER_CONTROL_WEIGHT = 6;
export const BACK_ROW_DEFENSE_WEIGHT = 12;
export const EDGE_VULNERABILITY_PENALTY = -4;
export const MOBILITY_WEIGHT = 3;

export function evaluatePlayerScore(board: PieceValue[], player: Player): number {
  let score = 0;

  for (let i = 0; i < TOTAL_SQUARES; i++) {
    const piece = board[i];
    if (getPiecePlayer(piece) !== player) continue;

    const coord = SQUARE_COORDS[i];

    // 1. Material Weights
    if (isKing(piece)) {
      score += MATERIAL_KING_WEIGHT;
    } else {
      score += MATERIAL_MAN_WEIGHT;

      // 2. Rank advancement (only for men)
      const rankAdvancement = player === 1 ? 7 - coord.row : coord.row;
      score += rankAdvancement * RANK_ADVANCEMENT_WEIGHT;

      // 3. Edge vulnerability (only for men on outer columns 0 or 7)
      if (coord.col === 0 || coord.col === 7) {
        score += EDGE_VULNERABILITY_PENALTY;
      }
    }

    // 4. Center control (both men and kings)
    if (CENTER_SQUARES.has(i)) {
      score += CENTER_CONTROL_WEIGHT;
    }

    // 5. Back-row defense (pieces resting on their home row)
    const isHomeRow = player === 1 ? coord.row === 7 : coord.row === 0;
    if (isHomeRow) {
      score += BACK_ROW_DEFENSE_WEIGHT;
    }
  }

  // 6. Mobility (+3 per legal move available)
  const mobility = getLegalMovesForPlayer(board, player).length;
  score += mobility * MOBILITY_WEIGHT;

  return score;
}

export function evaluateState(state: CheckersState, perspectivePlayer: Player): number {
  const opponent = getOpponent(perspectivePlayer);

  // Terminal conditions
  if (state.winner !== null) {
    if (state.winner === perspectivePlayer) return 100000;
    if (state.winner === opponent) return -100000;
    return 0; // Draw
  }

  const myScore = evaluatePlayerScore(state.board, perspectivePlayer);
  const oppScore = evaluatePlayerScore(state.board, opponent);

  return myScore - oppScore;
}
