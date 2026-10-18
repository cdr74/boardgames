import { createInitialGameState, serializeGameState } from './board';
import { evaluateState } from './evaluator';
import { applyMove, checkGameOver, getLegalMoves } from './rules';
import { GameState, Move } from './types';
import { GameOverResult, IGameDefinition, Player } from '../../platform/types';

export class NineMensMorrisGameDefinition implements IGameDefinition<GameState, Move> {
  public readonly id = 'nine-mens-morris';
  public readonly name = "Nine Men's Morris";

  public getInitialState(): GameState {
    return createInitialGameState();
  }

  public getCurrentPlayer(state: GameState): Player {
    return state.turn;
  }

  public getLegalMoves(state: GameState): Move[] {
    return getLegalMoves(state);
  }

  public applyMove(state: GameState, move: Move): GameState {
    return applyMove(state, move);
  }

  public evaluateState(state: GameState, perspectivePlayer: Player): number {
    return evaluateState(state, perspectivePlayer);
  }

  public serializeState(state: GameState): string {
    return serializeGameState(state);
  }

  public checkGameOver(state: GameState): GameOverResult {
    checkGameOver(state);

    if (state.winner === 'draw') {
      return {
        isOver: true,
        winner: null,
        reason: state.winReason,
      };
    }

    if (state.winner !== null) {
      return {
        isOver: true,
        winner: state.winner,
        reason: state.winReason,
      };
    }

    return {
      isOver: false,
      winner: null,
    };
  }

  public isTacticalMove(move: Move): boolean {
    return move.capture !== undefined;
  }

  public orderMoves(moves: Move[], _state: GameState, deterministic = false): Move[] {
    const captures: Move[] = [];
    const quiets: Move[] = [];

    for (const move of moves) {
      if (move.capture !== undefined) {
        captures.push(move);
      } else {
        quiets.push(move);
      }
    }

    if (!deterministic) {
      this.shuffle(captures);
      this.shuffle(quiets);
    }

    return [...captures, ...quiets];
  }

  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }
}

export const morrisGameDefinition = new NineMensMorrisGameDefinition();
