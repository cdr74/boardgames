import { GameOverResult, Player } from '../../platform/types';
import {
  cloneCheckersState,
  countPieces,
  crownPiece,
  getOpponent,
  getPiecePlayer,
  isKing,
  isMan,
  serializeCheckersState,
} from './board';
import {
  BLACK_MAN_DIRECTIONS,
  Direction,
  isKingRow,
  JUMP_NEIGHBORS,
  KING_DIRECTIONS,
  STEP_NEIGHBORS,
  TOTAL_SQUARES,
  WHITE_MAN_DIRECTIONS,
} from './constants';
import { CheckersMove, CheckersState, EMPTY, PieceValue, SquareIndex } from './types';

export function getLegalMovesForPlayer(board: PieceValue[], player: Player): CheckersMove[] {
  const jumpMoves: CheckersMove[] = [];

  // Step 1: Scan for all jump moves
  for (let i = 0; i < TOTAL_SQUARES; i++) {
    const piece = board[i];
    if (getPiecePlayer(piece) !== player) continue;

    findJumpSequences(board, player, i, i, piece, [i], [], jumpMoves);
  }

  // Step 2: Mandatory Jump Rule - if any jump exists, only jumps are legal
  if (jumpMoves.length > 0) {
    return jumpMoves;
  }

  // Step 3: If no jumps, scan for simple diagonal step moves
  const simpleMoves: CheckersMove[] = [];
  for (let i = 0; i < TOTAL_SQUARES; i++) {
    const piece = board[i];
    if (getPiecePlayer(piece) !== player) continue;

    const allowedDirs = getAllowedDirections(piece, player);
    const neighbors = STEP_NEIGHBORS[i];

    for (const neighbor of neighbors) {
      if (!allowedDirs.includes(neighbor.dir)) continue;

      if (board[neighbor.to] === EMPTY) {
        const crowns = isMan(piece) && isKingRow(player, neighbor.to);
        simpleMoves.push({
          from: i,
          to: neighbor.to,
          isJump: false,
          path: [i, neighbor.to],
          captures: [],
          crowned: crowns,
        });
      }
    }
  }

  return simpleMoves;
}

export function getLegalMoves(state: CheckersState): CheckersMove[] {
  if (state.winner !== null) {
    return [];
  }
  return getLegalMovesForPlayer(state.board, state.turn);
}

function getAllowedDirections(piece: PieceValue, player: Player): readonly Direction[] {
  if (isKing(piece)) {
    return KING_DIRECTIONS;
  }
  return player === 1 ? BLACK_MAN_DIRECTIONS : WHITE_MAN_DIRECTIONS;
}

function findJumpSequences(
  board: PieceValue[],
  player: Player,
  startSq: SquareIndex,
  currentSq: SquareIndex,
  currentPiece: PieceValue,
  currentPath: SquareIndex[],
  currentCaptures: SquareIndex[],
  outMoves: CheckersMove[]
): void {
  const opponent = getOpponent(player);
  const allowedDirs = getAllowedDirections(currentPiece, player);
  const jumps = JUMP_NEIGHBORS[currentSq];

  for (const jump of jumps) {
    if (!allowedDirs.includes(jump.dir)) continue;

    const overPiece = board[jump.over];
    const toPiece = board[jump.to];

    // Must jump an opponent piece into an empty landing square
    if (getPiecePlayer(overPiece) === opponent && toPiece === EMPTY) {
      // Temporarily apply jump step
      board[currentSq] = EMPTY;
      board[jump.over] = EMPTY;
      board[jump.to] = currentPiece;

      const pathSoFar = [...currentPath, jump.to];
      const capturesSoFar = [...currentCaptures, jump.over];

      // King Crowning & Immediate Turn End rule:
      // If a man reaches the opponent king row during a jump, it crowns and its turn terminates immediately
      const reachedKingRowAsMan = isMan(currentPiece) && isKingRow(player, jump.to);

      if (reachedKingRowAsMan) {
        // Crowns and ends turn immediately
        outMoves.push({
          from: startSq,
          to: jump.to,
          isJump: true,
          path: pathSoFar,
          captures: capturesSoFar,
          crowned: true,
        });
      } else {
        // Check if further jumps exist from this new landing square
        const movesBeforeRecurse = outMoves.length;
        findJumpSequences(
          board,
          player,
          startSq,
          jump.to,
          currentPiece,
          pathSoFar,
          capturesSoFar,
          outMoves
        );

        // If no further jumps could be made from jump.to, this sequence terminates here
        if (outMoves.length === movesBeforeRecurse) {
          outMoves.push({
            from: startSq,
            to: jump.to,
            isJump: true,
            path: pathSoFar,
            captures: capturesSoFar,
            crowned: false,
          });
        }
      }

      // Backtrack
      board[currentSq] = currentPiece;
      board[jump.over] = overPiece;
      board[jump.to] = EMPTY;
    }
  }

  // Note: if anyJumpPossibleFromHere is false and currentCaptures.length > 0,
  // the leaf termination is handled by the caller checking if outMoves grew.
}

export function applyMove(state: CheckersState, move: CheckersMove): CheckersState {
  const nextState = cloneCheckersState(state);
  const piece = nextState.board[move.from];
  const player = state.turn;
  const opponent = getOpponent(player);

  // 1. Remove piece from start square
  nextState.board[move.from] = EMPTY;

  // 2. Remove all captured pieces
  if (move.isJump && move.captures.length > 0) {
    for (const capSq of move.captures) {
      nextState.board[capSq] = EMPTY;
    }
  }

  // 3. Determine crowning and place piece at destination
  const crowns = move.crowned || (isMan(piece) && isKingRow(player, move.to));
  nextState.board[move.to] = crowns ? crownPiece(piece) : piece;

  // 4. Update 40-move rule counter (80 plies)
  // Resets on capture or man move; increments only on quiet king moves
  if (move.isJump || isMan(piece)) {
    nextState.pliesWithoutCaptureOrManAdvance = 0;
  } else {
    nextState.pliesWithoutCaptureOrManAdvance += 1;
  }

  // 5. Switch active turn
  nextState.turn = opponent;

  // 6. Record history for threefold repetition
  const serialized = serializeCheckersState(nextState);
  nextState.history.push(serialized);

  // 7. Check terminal state
  checkGameOver(nextState);

  return nextState;
}

export function checkGameOver(state: CheckersState): GameOverResult {
  if (state.winner !== null) {
    return {
      isOver: true,
      winner: state.winner === 'draw' ? null : state.winner,
      reason: state.winReason,
    };
  }

  // 1. 40-move rule (80 plies without capture or man advance)
  if (state.pliesWithoutCaptureOrManAdvance >= 80) {
    state.winner = 'draw';
    state.winReason = 'forty_move_rule';
    return { isOver: true, winner: null, reason: state.winReason };
  }

  // 2. Threefold repetition
  const currentSerialized = serializeCheckersState(state);
  let repCount = 0;
  for (const h of state.history) {
    if (h === currentSerialized) {
      repCount++;
    }
  }
  if (repCount >= 3) {
    state.winner = 'draw';
    state.winReason = 'repetition';
    return { isOver: true, winner: null, reason: state.winReason };
  }

  // 3. Annihilation check
  const counts = countPieces(state.board);
  const activePieceCount = state.turn === 1 ? counts.totalBlack : counts.totalWhite;
  if (activePieceCount === 0) {
    const winner = getOpponent(state.turn);
    state.winner = winner;
    state.winReason = 'pieces';
    return { isOver: true, winner, reason: state.winReason };
  }

  // 4. Trapped check (no legal moves on active turn)
  const legalMoves = getLegalMoves(state);
  if (legalMoves.length === 0) {
    const winner = getOpponent(state.turn);
    state.winner = winner;
    state.winReason = 'trapped';
    return { isOver: true, winner, reason: state.winReason };
  }

  return { isOver: false, winner: null };
}
