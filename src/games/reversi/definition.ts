import { DifficultyLevel, EngineSearchOptions, GameOverResult, IGameDefinition, Player } from '../../platform/types';
import { createInitialReversiState, serializeReversiState } from './board';
import {
  evaluateReversiState,
  isReversiTacticalMove,
  orderReversiMoves,
} from './evaluator';
import { applyMove, getLegalMoves } from './rules';
import { ReversiMove, ReversiState } from './types';

export const reversiGameDefinition: IGameDefinition<ReversiState, ReversiMove> = {
  id: 'reversi',
  name: 'Reversi',

  getInitialState(): ReversiState {
    return createInitialReversiState();
  },

  getCurrentPlayer(state: ReversiState): Player {
    return state.turn;
  },

  getLegalMoves(state: ReversiState): ReversiMove[] {
    return getLegalMoves(state);
  },

  applyMove(state: ReversiState, move: ReversiMove): ReversiState {
    return applyMove(state, move);
  },

  evaluateState(state: ReversiState, perspectivePlayer: Player, difficulty?: DifficultyLevel): number {
    return evaluateReversiState(state, perspectivePlayer, difficulty);
  },

  serializeState(state: ReversiState): string {
    return serializeReversiState(state);
  },

  checkGameOver(state: ReversiState): GameOverResult {
    return {
      isOver: state.winner !== null,
      winner: state.winner === 'draw' ? null : state.winner,
      reason: state.winReason,
    };
  },

  orderMoves(
    moves: ReversiMove[],
    state: ReversiState,
    _deterministic?: boolean
  ): ReversiMove[] {
    return orderReversiMoves(moves, state);
  },

  isTacticalMove(move: ReversiMove, _state: ReversiState): boolean {
    return isReversiTacticalMove(move);
  },

  getDifficultyConfig(level: DifficultyLevel): Partial<EngineSearchOptions> {
    if (level === 1) {
      return { maxDepth: 1, epsilon: 160, temperature: 40, blunderRate: 0.35 };
    }
    if (level === 2) {
      return { maxDepth: 2, epsilon: 90, temperature: 25, blunderRate: 0 };
    }
    if (level === 3) {
      // Reversi Medium: Depth 4 with wider candidate epsilon (45) and moderated heuristics
      return { maxDepth: 4, epsilon: 45, temperature: 18, blunderRate: 0 };
    }
    if (level === 4) {
      return { maxDepth: 6, epsilon: 10, temperature: 6, blunderRate: 0 };
    }
    return { maxDepth: 8, epsilon: 0, temperature: 1, blunderRate: 0 };
  },
};
