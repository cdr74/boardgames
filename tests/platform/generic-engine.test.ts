import { describe, expect, it } from 'vitest';
import { morrisGameDefinition } from '../../src/games/morris';
import { GenericMinimaxEngine } from '../../src/platform/engine/minimax';

describe('Generic Platform Minimax Engine', () => {
  const engine = new GenericMinimaxEngine(morrisGameDefinition);

  it('initializes and executes search via generic IGameDefinition', () => {
    const initialState = morrisGameDefinition.getInitialState();
    expect(initialState.turn).toBe(1);

    const result = engine.search(initialState, {
      difficulty: 3,
      maxDepth: 2,
      timeLimitMs: 500,
      deterministic: true,
    });

    expect(result.bestMove).toBeDefined();
    expect(result.bestMove.type).toBe('place');
    expect(result.depthReached).toBeGreaterThanOrEqual(1);
    expect(result.nodesEvaluated).toBeGreaterThan(0);
  });

  it('correctly executes immediate mill capture using generic interface', () => {
    const state = morrisGameDefinition.getInitialState();
    state.turn = 2; // Black to move
    state.board[0] = 2;
    state.board[1] = 2;
    state.blackPiecesOnBoard = 2;
    state.blackPiecesInHand = 7;

    state.board[4] = 1;
    state.whitePiecesOnBoard = 1;
    state.whitePiecesInHand = 8;

    const result = engine.search(state, {
      difficulty: 3,
      maxDepth: 2,
      timeLimitMs: 500,
    });

    expect(result.bestMove.type).toBe('place');
    expect(result.bestMove.to).toBe(2);
    expect(result.bestMove.capture).toBe(4);
  });
});
