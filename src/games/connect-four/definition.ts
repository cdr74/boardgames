import { GameOverResult, IGameDefinition, Player } from '../../platform/types';
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
};
