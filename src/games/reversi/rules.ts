import { DIRECTIONS, TOTAL_SQUARES } from './constants';
import {
  cloneReversiState,
  coordFromIndex,
  countDiscs,
  indexFromCoord,
  isInsideBoard,
} from './board';
import { Cell, EMPTY, Player, ReversiMove, ReversiState, SquareIndex } from './types';

export function getOpponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}

/**
 * Calculates all opponent squares that will be bracketed and flipped by placing
 * a disc of `player` on `square`. Returns an empty array if move is illegal.
 */
export function getFlipsForMove(
  board: Cell[],
  square: SquareIndex,
  player: Player
): SquareIndex[] {
  if (square < 0 || square >= TOTAL_SQUARES || board[square] !== EMPTY) {
    return [];
  }

  const { col, row } = coordFromIndex(square);
  const opponent = getOpponent(player);
  const allFlips: SquareIndex[] = [];

  for (let d = 0; d < DIRECTIONS.length; d++) {
    const [dCol, dRow] = DIRECTIONS[d];
    let c = col + dCol;
    let r = row + dRow;
    const rayFlips: SquareIndex[] = [];

    // Advance through contiguous sequence of opponent discs
    while (isInsideBoard(c, r) && board[indexFromCoord(c, r)] === opponent) {
      rayFlips.push(indexFromCoord(c, r));
      c += dCol;
      r += dRow;
    }

    // Must be terminated by a disc of the active player
    if (
      rayFlips.length > 0 &&
      isInsideBoard(c, r) &&
      board[indexFromCoord(c, r)] === player
    ) {
      allFlips.push(...rayFlips);
    }
  }

  return allFlips;
}

export function getLegalMovesForPlayer(board: Cell[], player: Player): ReversiMove[] {
  const moves: ReversiMove[] = [];
  for (let sq = 0; sq < TOTAL_SQUARES; sq++) {
    if (board[sq] === EMPTY) {
      const flips = getFlipsForMove(board, sq, player);
      if (flips.length > 0) {
        moves.push({
          square: sq,
          flippedSquares: flips,
        });
      }
    }
  }
  return moves;
}

export function getLegalMoves(state: ReversiState): ReversiMove[] {
  if (state.winner !== null) return [];
  return getLegalMovesForPlayer(state.board, state.turn);
}

export function isValidMove(state: ReversiState, square: SquareIndex): boolean {
  if (state.winner !== null) return false;
  return getFlipsForMove(state.board, square, state.turn).length > 0;
}

export function applyMove(state: ReversiState, move: ReversiMove): ReversiState {
  if (state.winner !== null) {
    throw new Error('Cannot apply move in terminal state');
  }

  const flips = getFlipsForMove(state.board, move.square, state.turn);
  if (flips.length === 0) {
    throw new Error(
      `Illegal Reversi move on square ${move.square}: does not flank any opponent pieces`
    );
  }

  const next = cloneReversiState(state);
  const player = state.turn;
  const opponent = getOpponent(player);

  // 1. Place active player's disc
  next.board[move.square] = player;

  // 2. Flip bracketed opponent discs
  for (let i = 0; i < flips.length; i++) {
    next.board[flips[i]] = player;
  }

  next.lastMove = {
    square: move.square,
    flippedSquares: flips,
  };
  next.movesCount += 1;

  // 3. Update disc counts
  const counts = countDiscs(next.board);
  next.blackCount = counts.black;
  next.whiteCount = counts.white;

  // 4. Wipeout check
  if (next.blackCount === 0) {
    next.winner = 2;
    next.winReason = 'wipeout';
    return next;
  }
  if (next.whiteCount === 0) {
    next.winner = 1;
    next.winReason = 'wipeout';
    return next;
  }

  // 5. Turn resolution and pass check
  const oppMoves = getLegalMovesForPlayer(next.board, opponent);
  if (oppMoves.length > 0) {
    next.turn = opponent;
    next.isPass = false;
    next.consecutivePasses = 0;
  } else {
    // Opponent has no legal moves -> check if current player has moves
    const playerMoves = getLegalMovesForPlayer(next.board, player);
    if (playerMoves.length > 0) {
      // Opponent must pass, turn returns to current player
      next.turn = player;
      next.isPass = true;
      next.consecutivePasses = 1;
    } else {
      // Neither player has legal moves -> game terminates
      next.isPass = false;
      next.consecutivePasses = 2;
      if (next.blackCount > next.whiteCount) {
        next.winner = 1;
      } else if (next.whiteCount > next.blackCount) {
        next.winner = 2;
      } else {
        next.winner = 'draw';
      }
      next.winReason = counts.empty === 0 ? 'board_full' : 'no_moves';
    }
  }

  return next;
}
