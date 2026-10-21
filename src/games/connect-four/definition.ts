import { DifficultyLevel, EngineSearchOptions, GameOverResult, IGameDefinition, Player } from '../../platform/types';
import {
  createInitialConnectFourState,
  serializeConnectFourState,
} from './board';
import { evaluateConnectFourState, isConnectFourTacticalMove } from './evaluator';
import { applyMove, getLegalMoves } from './rules';
import { ConnectFourMove, ConnectFourState } from './types';

export const connectFourGameDefinition: IGameDefinition<ConnectFourState, ConnectFourMove> = {
  id: 'connect-four',
  name: 'Connect Four',

  getInitialState(): ConnectFourState {
    return createInitialConnectFourState();
  },

  getCurrentPlayer(state: ConnectFourState): Player {
    return state.turn;
  },

  getLegalMoves(state: ConnectFourState): ConnectFourMove[] {
    return getLegalMoves(state);
  },

  applyMove(state: ConnectFourState, move: ConnectFourMove): ConnectFourState {
    return applyMove(state, move);
  },

  evaluateState(state: ConnectFourState, perspectivePlayer: Player): number {
    return evaluateConnectFourState(state, perspectivePlayer);
  },

  serializeState(state: ConnectFourState): string {
    return serializeConnectFourState(state);
  },

  checkGameOver(state: ConnectFourState): GameOverResult {
    return {
      isOver: state.winner !== null,
      winner: state.winner === 'draw' ? null : state.winner,
      reason: state.winReason,
    };
  },

  orderMoves(
    moves: ConnectFourMove[],
    _state: ConnectFourState,
    _deterministic?: boolean
  ): ConnectFourMove[] {
    // getLegalMoves already orders moves center-out ([3, 2, 4, 1, 5, 0, 6])
    return moves;
  },

  isTacticalMove(move: ConnectFourMove, state: ConnectFourState): boolean {
    return isConnectFourTacticalMove(move, state);
  },

  getDifficultyConfig(level: DifficultyLevel): Partial<EngineSearchOptions> {
    if (level === 1) {
      return { maxDepth: 1, epsilon: 60, temperature: 25, blunderRate: 0.35 };
    }
    if (level === 2) {
      return { maxDepth: 2, epsilon: 35, temperature: 20, blunderRate: 0 };
    }
    if (level === 3) {
      // Connect Four Medium: Depth 3 blocks direct 1-move threats without foreseeing 4-ply fork traps
      return { maxDepth: 3, epsilon: 16, temperature: 14, blunderRate: 0 };
    }
    if (level === 4) {
      return { maxDepth: 6, epsilon: 4, temperature: 4, blunderRate: 0 };
    }
    return { maxDepth: 8, epsilon: 0, temperature: 1, blunderRate: 0 };
  },
};
