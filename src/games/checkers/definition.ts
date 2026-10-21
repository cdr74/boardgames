import { GameOverResult, IGameDefinition, Player } from '../../platform/types';
import { createInitialCheckersState, isKing, serializeCheckersState } from './board';
import { SQUARE_COORDS } from './constants';
import { evaluateState } from './evaluator';
import { applyMove, checkGameOver, getLegalMoves } from './rules';
import { CheckersMove, CheckersState, SquareIndex } from './types';

const CENTER_SQUARES = new Set<SquareIndex>([9, 10, 13, 14, 17, 18, 21, 22]);

export class CheckersGameDefinition implements IGameDefinition<CheckersState, CheckersMove> {
  public readonly id = 'checkers';
  public readonly name = 'English Checkers';

  public getInitialState(): CheckersState {
    return createInitialCheckersState();
  }

  public getCurrentPlayer(state: CheckersState): Player {
    return state.turn;
  }

  public getLegalMoves(state: CheckersState): CheckersMove[] {
    return getLegalMoves(state);
  }

  public applyMove(state: CheckersState, move: CheckersMove): CheckersState {
    return applyMove(state, move);
  }

  public evaluateState(state: CheckersState, perspectivePlayer: Player): number {
    return evaluateState(state, perspectivePlayer);
  }

  public serializeState(state: CheckersState): string {
    return serializeCheckersState(state);
  }

  public checkGameOver(state: CheckersState): GameOverResult {
    return checkGameOver(state);
  }

  public isTacticalMove(move: CheckersMove): boolean {
    return move.isJump;
  }

  public orderMoves(
    moves: CheckersMove[],
    state: CheckersState,
    deterministic = false
  ): CheckersMove[] {
    const scored = moves.map((move) => {
      let score = 0;
      if (move.isJump) {
        score += 10000 + move.captures.length * 1000;
      } else {
        const piece = state.board[move.from];
        if (isKing(piece)) {
          score += 500;
        }
        if (CENTER_SQUARES.has(move.to)) {
          score += 200;
        }
        const player = state.turn;
        const fromRow = SQUARE_COORDS[move.from].row;
        const toRow = SQUARE_COORDS[move.to].row;
        const advancement = player === 1 ? fromRow - toRow : toRow - fromRow;
        score += advancement * 50;
      }
      return { move, score };
    });

    if (!deterministic) {
      scored.forEach((s) => {
        s.score += (Math.random() - 0.5) * 10;
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.move);
  }
}

export const checkersGameDefinition = new CheckersGameDefinition();
