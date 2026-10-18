import { ADJACENCY_LIST, MILLS, POINT_TO_MILLS } from './constants';
import { getOpponent, getPlayerPhase } from './board';
import { EMPTY, GameState, Player, PointId, PointState } from './types';

export function countFormedMills(board: PointState[], player: Player): number {
  let count = 0;
  for (const [p1, p2, p3] of MILLS) {
    if (board[p1] === player && board[p2] === player && board[p3] === player) {
      count++;
    }
  }
  return count;
}

export function countTwoPieceConfigurations(board: PointState[], player: Player): number {
  let count = 0;
  for (const [p1, p2, p3] of MILLS) {
    const s1 = board[p1];
    const s2 = board[p2];
    const s3 = board[p3];

    // Exactly 2 of player's pieces and 1 empty
    if (
      (s1 === player && s2 === player && s3 === EMPTY) ||
      (s1 === player && s3 === player && s2 === EMPTY) ||
      (s2 === player && s3 === player && s1 === EMPTY)
    ) {
      count++;
    }
  }
  return count;
}

export function countMobility(board: PointState[], player: Player): number {
  let mobility = 0;
  for (let i = 0; i < 24; i++) {
    const pt = i as PointId;
    if (board[pt] === player) {
      for (const neighbor of ADJACENCY_LIST[pt]) {
        if (board[neighbor] === EMPTY) {
          mobility++;
        }
      }
    }
  }
  return mobility;
}

export function countDoubleMillPotential(board: PointState[], player: Player): number {
  // A double mill (Zwickmühle) exists when a player has an active mill,
  // and one of its pieces can move to an adjacent spot that forms another mill.
  let potential = 0;
  for (let i = 0; i < 24; i++) {
    const pt = i as PointId;
    if (board[pt] !== player) continue;

    // Check if pt is in a completed mill
    const millsWithPt = POINT_TO_MILLS[pt];
    const inMill = millsWithPt.some(
      ([p1, p2, p3]) => board[p1] === player && board[p2] === player && board[p3] === player
    );

    if (inMill) {
      // Check if moving to an adjacent empty spot completes another mill
      for (const neighbor of ADJACENCY_LIST[pt]) {
        if (board[neighbor] === EMPTY) {
          // Temporarily slide
          board[pt] = EMPTY;
          board[neighbor] = player;

          const formedNewMill = POINT_TO_MILLS[neighbor].some(
            ([p1, p2, p3]) => board[p1] === player && board[p2] === player && board[p3] === player
          );

          // Restore
          board[pt] = player;
          board[neighbor] = EMPTY;

          if (formedNewMill) {
            potential++;
            break;
          }
        }
      }
    }
  }
  return potential;
}

// Positional strategic weights based on graph connectivity degree during placement phase:
// - Middle midpoints (degree 4: 4 escape/sliding paths): 9, 11, 13, 15 -> weight 2
// - Outer & inner midpoints (degree 3: 3 paths): 1, 3, 5, 7, 17, 19, 21, 23 -> weight 1
// - Corners (degree 2: 2 paths, prone to trapping): 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22 -> weight 0
export const VERTEX_POSITIONAL_WEIGHTS: Record<PointId, number> = {
  // Outer square
  0: 0, 1: 1, 2: 0, 3: 1, 4: 0, 5: 1, 6: 0, 7: 1,
  // Middle square
  8: 0, 9: 2, 10: 0, 11: 2, 12: 0, 13: 2, 14: 0, 15: 2,
  // Inner square
  16: 0, 17: 1, 18: 0, 19: 1, 20: 0, 21: 1, 22: 0, 23: 1,
};

export function countPositionalStrategicValue(board: PointState[], player: Player): number {
  let score = 0;
  for (let i = 0; i < 24; i++) {
    if (board[i as PointId] === player) {
      score += VERTEX_POSITIONAL_WEIGHTS[i as PointId];
    }
  }
  return score;
}

export function evaluateState(state: GameState, perspectivePlayer: Player): number {
  const opponent = getOpponent(perspectivePlayer);

  // Terminal conditions
  if (state.winner !== null) {
    if (state.winner === perspectivePlayer) return 100000;
    if (state.winner === opponent) return -100000;
    return 0; // Draw
  }

  const phase = getPlayerPhase(state, perspectivePlayer);
  const myPieces = perspectivePlayer === 1 ? state.whitePiecesOnBoard : state.blackPiecesOnBoard;
  const oppPieces = opponent === 1 ? state.whitePiecesOnBoard : state.blackPiecesOnBoard;

  let score = 0;

  // 1. Piece count difference
  if (phase === 'placement') {
    score += (myPieces - oppPieces) * 20;

    // Positional connectivity value during placement
    const myPos = countPositionalStrategicValue(state.board, perspectivePlayer);
    const oppPos = countPositionalStrategicValue(state.board, opponent);
    score += (myPos - oppPos);
  } else {
    score += (myPieces - oppPieces) * 120;
  }

  // 2. Formed mills
  const myMills = countFormedMills(state.board, perspectivePlayer);
  const oppMills = countFormedMills(state.board, opponent);
  score += (myMills - oppMills) * 45;

  // 3. 2-piece configurations (threats)
  const myThreats = countTwoPieceConfigurations(state.board, perspectivePlayer);
  const oppThreats = countTwoPieceConfigurations(state.board, opponent);
  score += (myThreats - oppThreats) * 25;

  // 4. Mobility (only in movement phase)
  if (phase === 'movement') {
    const myMobility = countMobility(state.board, perspectivePlayer);
    const oppMobility = countMobility(state.board, opponent);
    score += (myMobility - oppMobility) * 8;

    // 5. Double mill (Zwickmühle) detection
    const myDoubleMills = countDoubleMillPotential(state.board, perspectivePlayer);
    const oppDoubleMills = countDoubleMillPotential(state.board, opponent);
    score += (myDoubleMills - oppDoubleMills) * 60;
  }

  return score;
}
