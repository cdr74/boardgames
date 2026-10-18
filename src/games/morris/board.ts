import { BOARD_SIZE, TOTAL_PIECES_PER_PLAYER } from './constants';
import { EMPTY, GameState, Phase, Player, PointState } from './types';

export function createInitialGameState(flyingEnabled = true): GameState {
  const board: PointState[] = new Array(BOARD_SIZE).fill(EMPTY);
  return {
    board,
    turn: 1, // Player 1 (White) starts
    whitePiecesInHand: TOTAL_PIECES_PER_PLAYER,
    blackPiecesInHand: TOTAL_PIECES_PER_PLAYER,
    whitePiecesOnBoard: 0,
    blackPiecesOnBoard: 0,
    pendingCapture: false,
    moveCountWithoutCapture: 0,
    history: [],
    winner: null,
    flyingEnabled,
  };
}

export function getOpponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}

export function getPlayerPhase(state: GameState, player: Player): Phase {
  const inHand = player === 1 ? state.whitePiecesInHand : state.blackPiecesInHand;
  if (inHand > 0) {
    return 'placement';
  }
  const onBoard = player === 1 ? state.whitePiecesOnBoard : state.blackPiecesOnBoard;
  if (state.flyingEnabled && onBoard === 3) {
    return 'flying';
  }
  return 'movement';
}

export function cloneGameState(state: GameState): GameState {
  return {
    board: [...state.board],
    turn: state.turn,
    whitePiecesInHand: state.whitePiecesInHand,
    blackPiecesInHand: state.blackPiecesInHand,
    whitePiecesOnBoard: state.whitePiecesOnBoard,
    blackPiecesOnBoard: state.blackPiecesOnBoard,
    pendingCapture: state.pendingCapture,
    captureMoveBase: state.captureMoveBase ? { ...state.captureMoveBase } : undefined,
    moveCountWithoutCapture: state.moveCountWithoutCapture,
    history: [...state.history],
    winner: state.winner,
    winReason: state.winReason,
    flyingEnabled: state.flyingEnabled,
  };
}

export function serializeGameState(state: GameState): string {
  // Compact state representation for repetition checking:
  // board (24 chars) + turn + pendingCapture + piecesInHand
  return `${state.board.join('')}:${state.turn}:${state.pendingCapture ? 1 : 0}:${state.whitePiecesInHand}:${state.blackPiecesInHand}`;
}
