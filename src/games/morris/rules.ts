import { ADJACENCY_LIST, POINT_TO_MILLS } from './constants';
import { cloneGameState, getOpponent, getPlayerPhase, serializeGameState } from './board';
import { EMPTY, GameState, Move, Player, PointId, PointState } from './types';

export function isMillAtPoint(board: PointState[], point: PointId, player: Player): boolean {
  const mills = POINT_TO_MILLS[point];
  for (const [p1, p2, p3] of mills) {
    if (board[p1] === player && board[p2] === player && board[p3] === player) {
      return true;
    }
  }
  return false;
}

export function isPointInAnyMill(board: PointState[], point: PointId): boolean {
  const player = board[point];
  if (player === EMPTY) return false;
  return isMillAtPoint(board, point, player);
}

export function formsMillOnMove(
  board: PointState[],
  from: PointId | undefined,
  to: PointId,
  player: Player
): boolean {
  // Simulate board after move
  const originalFrom = from !== undefined ? board[from] : EMPTY;
  const originalTo = board[to];

  if (from !== undefined) board[from] = EMPTY;
  board[to] = player;

  const result = isMillAtPoint(board, to, player);

  // Restore board
  if (from !== undefined) board[from] = originalFrom;
  board[to] = originalTo;

  return result;
}

export function getValidCaptureTargets(board: PointState[], opponent: Player): PointId[] {
  const allOpponentPieces: PointId[] = [];
  for (let i = 0; i < 24; i++) {
    if (board[i as PointId] === opponent) {
      allOpponentPieces.push(i as PointId);
    }
  }

  const nonMillPieces = allOpponentPieces.filter(p => !isPointInAnyMill(board, p));
  return nonMillPieces.length > 0 ? nonMillPieces : allOpponentPieces;
}

export function getLegalMoves(state: GameState): Move[] {
  if (state.winner !== null) return [];

  const player = state.turn;
  const opponent = getOpponent(player);
  const phase = getPlayerPhase(state, player);
  const moves: Move[] = [];

  const addMoveWithCaptures = (type: 'place' | 'slide' | 'fly', to: PointId, from?: PointId) => {
    const isMill = formsMillOnMove(state.board, from, to, player);
    if (isMill) {
      // Temporarily apply placement/slide to find valid captures
      const originalFrom = from !== undefined ? state.board[from] : EMPTY;
      if (from !== undefined) state.board[from] = EMPTY;
      state.board[to] = player;

      const captureTargets = getValidCaptureTargets(state.board, opponent);

      // Restore
      if (from !== undefined) state.board[from] = originalFrom;
      state.board[to] = EMPTY;

      if (captureTargets.length === 0) {
        // Opponent has no pieces to capture
        moves.push({ type, from, to });
      } else {
        for (const capture of captureTargets) {
          moves.push({ type, from, to, capture });
        }
      }
    } else {
      moves.push({ type, from, to });
    }
  };

  if (phase === 'placement') {
    for (let i = 0; i < 24; i++) {
      const pt = i as PointId;
      if (state.board[pt] === EMPTY) {
        addMoveWithCaptures('place', pt);
      }
    }
  } else if (phase === 'movement') {
    for (let i = 0; i < 24; i++) {
      const from = i as PointId;
      if (state.board[from] === player) {
        const neighbors = ADJACENCY_LIST[from];
        for (const to of neighbors) {
          if (state.board[to] === EMPTY) {
            addMoveWithCaptures('slide', to, from);
          }
        }
      }
    }
  } else if (phase === 'flying') {
    // Player has 3 pieces and flying is active
    for (let i = 0; i < 24; i++) {
      const from = i as PointId;
      if (state.board[from] === player) {
        for (let j = 0; j < 24; j++) {
          const to = j as PointId;
          if (state.board[to] === EMPTY) {
            addMoveWithCaptures('fly', to, from);
          }
        }
      }
    }
  }

  return moves;
}

export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneGameState(state);
  const player = next.turn;
  const opponent = getOpponent(player);

  if (move.type === 'place') {
    next.board[move.to] = player;
    if (player === 1) {
      next.whitePiecesInHand--;
      next.whitePiecesOnBoard++;
    } else {
      next.blackPiecesInHand--;
      next.blackPiecesOnBoard++;
    }
  } else {
    // slide or fly
    if (move.from !== undefined) {
      next.board[move.from] = EMPTY;
    }
    next.board[move.to] = player;
  }

  // Handle capture if present
  if (move.capture !== undefined) {
    next.board[move.capture] = EMPTY;
    if (opponent === 1) {
      next.whitePiecesOnBoard--;
    } else {
      next.blackPiecesOnBoard--;
    }
    next.moveCountWithoutCapture = 0; // Reset 50-move counter on capture
  } else {
    next.moveCountWithoutCapture++;
  }

  // Switch turn
  next.turn = opponent;
  next.pendingCapture = false;
  next.captureMoveBase = undefined;

  // Record serialized position in history for repetition check
  const serialized = serializeGameState(next);
  next.history.push(serialized);

  // Check Game Over Conditions
  checkGameOver(next);

  return next;
}

export function checkGameOver(state: GameState): void {
  if (state.winner !== null) return;

  const current = state.turn;
  const currentInHand = current === 1 ? state.whitePiecesInHand : state.blackPiecesInHand;
  const currentOnBoard = current === 1 ? state.whitePiecesOnBoard : state.blackPiecesOnBoard;
  const opponent = getOpponent(current);

  // 1. Piece count win condition (only evaluated after placement phase)
  if (currentInHand === 0 && currentOnBoard < 3) {
    state.winner = opponent;
    state.winReason = 'pieces';
    return;
  }

  // 2. Trapped win condition (only in movement phase when player has pieces on board)
  if (currentInHand === 0) {
    const legalMoves = getLegalMoves(state);
    if (legalMoves.length === 0) {
      state.winner = opponent;
      state.winReason = 'trapped';
      return;
    }
  }

  // 3. 50-move rule draw condition (50 turns without capture)
  if (state.moveCountWithoutCapture >= 50) {
    state.winner = 'draw';
    state.winReason = 'fifty_move_rule';
    return;
  }

  // 4. Threefold repetition draw condition
  const currentSerialized = serializeGameState(state);
  let count = 0;
  for (const pos of state.history) {
    if (pos === currentSerialized) {
      count++;
      if (count >= 3) {
        state.winner = 'draw';
        state.winReason = 'repetition';
        return;
      }
    }
  }
}
