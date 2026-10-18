import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../../src/games/morris/board';
import { evaluateState } from '../../../src/games/morris/evaluator';
import { morrisGameDefinition } from '../../../src/games/morris';
import { GenericMinimaxEngine } from '../../../src/platform/engine/minimax';

describe('Deterministic Game Engine', () => {
  const engine = new GenericMinimaxEngine(morrisGameDefinition);

  it('evaluates terminal winning states with high score and losing with low score', () => {
    const state = createInitialGameState();
    state.winner = 2; // Engine (Black) won
    expect(evaluateState(state, 2)).toBe(100000);
    expect(evaluateState(state, 1)).toBe(-100000);
  });

  it('selects immediate mill-forming move in placement phase', () => {
    const state = createInitialGameState();
    state.turn = 2; // Black to move
    // Black has 2 pieces in outer line at 0 and 1. Point 2 is empty.
    state.board[0] = 2;
    state.board[1] = 2;
    state.blackPiecesOnBoard = 2;
    state.blackPiecesInHand = 7;

    // White has a piece at 4 that can be captured
    state.board[4] = 1;
    state.whitePiecesOnBoard = 1;
    state.whitePiecesInHand = 8;

    const result = engine.search(state, {
      difficulty: 3,
      maxDepth: 3,
      timeLimitMs: 1000,
    });

    expect(result.bestMove.type).toBe('place');
    expect(result.bestMove.to).toBe(2);
    expect(result.bestMove.capture).toBe(4);
  });

  it('blocks opponent from completing a mill in movement phase', () => {
    const state = createInitialGameState();
    state.whitePiecesInHand = 0;
    state.blackPiecesInHand = 0;
    state.whitePiecesOnBoard = 4;
    state.blackPiecesOnBoard = 4;
    state.turn = 2; // Black to move

    // Mill line (8, 9, 10)
    // White has pieces at 8 and 10, with point 9 empty.
    // Point 9's neighbors are: [8, 10, 1, 17]
    // White has a piece at 17 that threatens to slide into 9 to complete the mill!
    state.board[8] = 1;
    state.board[10] = 1;
    state.board[17] = 1;

    // Black has a piece at point 1 (adjacent to 9) that can slide 1 -> 9 to block White!
    state.board[1] = 2;

    // Distribute remaining pieces elsewhere so neither player has other mills
    state.board[4] = 1;
    state.board[12] = 2;
    state.board[14] = 2;
    state.board[20] = 2;

    const result = engine.search(state, {
      difficulty: 3,
      maxDepth: 4,
      timeLimitMs: 1500,
    });

    // The best move for Black must be to slide 1 -> 9, blocking White's mill
    expect(result.bestMove.from).toBe(1);
    expect(result.bestMove.to).toBe(9);
  });
});
