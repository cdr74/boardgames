import { GameOverResult, IGameDefinition, Player } from '../../platform/types';
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

  evaluateState(state: ReversiState, perspectivePlayer: Player): number {
    return evaluateReversiState(state, perspectivePlayer);
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
};
