import { CORNERS, DIRECTIONS, TOTAL_SQUARES } from './constants';
import { coordFromIndex, indexFromCoord, isInsideBoard } from './board';
import { getLegalMovesForPlayer, getOpponent } from './rules';
import { Cell, EMPTY, Player, ReversiMove, ReversiState } from './types';
import { DifficultyLevel } from '../../platform/types';

export const STATIC_WEIGHTS: readonly number[] = [
  100, -20,  10,   5,   5,  10, -20, 100,
  -20, -50,  -2,  -2,  -2,  -2, -50, -20,
   10,  -2,  -1,  -1,  -1,  -1,  -2,  10,
    5,  -2,  -1,   0,   0,  -1,  -2,   5,
    5,  -2,  -1,   0,   0,  -1,  -2,   5,
   10,  -2,  -1,  -1,  -1,  -1,  -2,  10,
  -20, -50,  -2,  -2,  -2,  -2, -50, -20,
  100, -20,  10,   5,   5,  10, -20, 100,
];

const CORNER_NEIGHBORS: readonly { corner: number; x: number; c: number[] }[] = [
  { corner: 0, x: 9, c: [1, 8] },
  { corner: 7, x: 14, c: [6, 15] },
  { corner: 56, x: 49, c: [48, 57] },
  { corner: 63, x: 54, c: [55, 62] },
];

/**
 * Counts the number of frontier discs (discs with at least one adjacent empty square).
 */
export function countFrontierDiscs(board: Cell[], player: Player): number {
  let count = 0;
  for (let sq = 0; sq < TOTAL_SQUARES; sq++) {
    if (board[sq] !== player) continue;

    const { col, row } = coordFromIndex(sq);
    let isFrontier = false;

    for (let d = 0; d < DIRECTIONS.length; d++) {
      const [dCol, dRow] = DIRECTIONS[d];
      const nc = col + dCol;
      const nr = row + dRow;
      if (isInsideBoard(nc, nr) && board[indexFromCoord(nc, nr)] === EMPTY) {
        isFrontier = true;
        break;
      }
    }

    if (isFrontier) count++;
  }
  return count;
}

/**
 * Evaluates the board state from the perspective of `perspectivePlayer`.
 * Incorporates positional weights with dynamic corner safety, mobility differential,
 * frontier exposure, and phase-scaled coin parity.
 */
export function evaluateReversiState(
  state: ReversiState,
  perspectivePlayer: Player,
  difficulty?: DifficultyLevel
): number {
  const opponent = getOpponent(perspectivePlayer);
  const myCount = perspectivePlayer === 1 ? state.blackCount : state.whiteCount;
  const oppCount = perspectivePlayer === 1 ? state.whiteCount : state.blackCount;

  // 1. Terminal evaluation
  if (state.winner !== null) {
    if (state.winner === perspectivePlayer) {
      return 100000 + (myCount - oppCount) * 100;
    }
    if (state.winner === opponent) {
      return -(100000 + (oppCount - myCount) * 100);
    }
    return 0; // Draw
  }

  const board = state.board;
  const totalDiscs = myCount + oppCount;

  // 2. Positional & Corner Weight Evaluation
  let positionalScore = 0;
  let myCorners = 0;
  let oppCorners = 0;

  for (let sq = 0; sq < TOTAL_SQUARES; sq++) {
    const piece = board[sq];
    if (piece === EMPTY) continue;

    let weight = STATIC_WEIGHTS[sq];

    // Dynamic adjustment: if adjacent corner is occupied, nullify danger penalties
    for (let i = 0; i < CORNER_NEIGHBORS.length; i++) {
      const cn = CORNER_NEIGHBORS[i];
      if (board[cn.corner] !== EMPTY) {
        if (sq === cn.x || cn.c.includes(sq)) {
          weight = piece === board[cn.corner] ? 15 : 0;
        }
      }
    }

    if (piece === perspectivePlayer) {
      positionalScore += weight;
      if (CORNERS.includes(sq)) myCorners++;
    } else {
      positionalScore -= weight;
      if (CORNERS.includes(sq)) oppCorners++;
    }
  }

  const cornerScore = (myCorners - oppCorners) * 200;

  // 3. Mobility (Legal Moves Differential)
  const myMoves = getLegalMovesForPlayer(board, perspectivePlayer).length;
  const oppMoves = getLegalMovesForPlayer(board, opponent).length;
  let mobilityScore = 0;
  if (myMoves + oppMoves > 0) {
    // Scale mobility weight by difficulty tier:
    // Level 1: 0 (Beginners don't calculate mobility differential)
    // Level 2: 1 (Gentle awareness of move options, +/- 100 max)
    // Level 3: 2 (Moderate positional awareness, +/- 200 max)
    // Level 4-5 (or undefined): 4 (Full master-level mobility starvation, +/- 400 max)
    const mobilityWeight =
      difficulty === 1 ? 0 :
      difficulty === 2 ? 1 :
      difficulty === 3 ? 2 : 4;

    mobilityScore = Math.round((100 * (myMoves - oppMoves)) / (myMoves + oppMoves)) * mobilityWeight;
  }

  // 4. Frontier Exposure (Fewer frontier pieces is preferable)
  const myFrontier = countFrontierDiscs(board, perspectivePlayer);
  const oppFrontier = countFrontierDiscs(board, opponent);
  // Scale frontier weight by difficulty tier:
  // Level 1: 0
  // Level 2: 2
  // Level 3: 4
  // Level 4-5 (or undefined): 6
  const frontierWeight =
    difficulty === 1 ? 0 :
    difficulty === 2 ? 2 :
    difficulty === 3 ? 4 : 6;

  const frontierScore = -(myFrontier - oppFrontier) * frontierWeight;

  // 5. Coin Parity (Graduated by game phase)
  let coinScore = 0;
  if (totalDiscs > 48) {
    // Late endgame: coin parity takes high priority
    coinScore = Math.round((100 * (myCount - oppCount)) / totalDiscs) * 10;
  } else if (totalDiscs > 30) {
    // Mid game: modest coin parity
    coinScore = (myCount - oppCount) * 2;
  }

  return positionalScore + cornerScore + mobilityScore + frontierScore + coinScore;
}

/**
 * Checks whether a move is tactical:
 * - Claims a corner square
 * - Or flips a large cluster (>= 5 pieces)
 */
export function isReversiTacticalMove(move: ReversiMove): boolean {
  if (CORNERS.includes(move.square)) return true;
  if (move.flippedSquares && move.flippedSquares.length >= 5) return true;
  return false;
}

/**
 * Orders moves by square static weight descending to maximize Alpha-Beta beta cutoffs.
 */
export function orderReversiMoves(
  moves: ReversiMove[],
  _state: ReversiState
): ReversiMove[] {
  return [...moves].sort((a, b) => {
    return STATIC_WEIGHTS[b.square] - STATIC_WEIGHTS[a.square];
  });
}
