import { describe, expect, it } from 'vitest';
import { reversiGameDefinition } from '../../../src/games/reversi/definition';
import { createInitialReversiState } from '../../../src/games/reversi/board';
import { GenericMinimaxEngine } from '../../../src/platform/engine/minimax';
import { DIFFICULTY_CONFIGS } from '../../../src/platform/engine/difficulty';
import { EMPTY } from '../../../src/games/reversi/types';

describe('Reversi - Generic Minimax Engine Search (TASK-404)', () => {
  const engine = new GenericMinimaxEngine(reversiGameDefinition);

  it('selects one of the 4 standard opening moves from the initial position', () => {
    const initialState = createInitialReversiState();
    const result = engine.search(initialState, {
      maxDepth: 3,
      deterministic: true,
    });

    expect(result.bestMove).toBeDefined();
    expect([19, 26, 37, 44]).toContain(result.bestMove.square);
    expect(result.depthReached).toBeGreaterThanOrEqual(3);
    expect(result.nodesEvaluated).toBeGreaterThan(0);
  });

  it('aggressively seizes an available corner move over edge or interior moves', () => {
    // Construct a board where Black can take top-left corner 0:
    // Black at 2 (c1), White at 1 (b1), Square 0 (a1) is empty.
    // Placing at 0 brackets White at 1 against Black at 2.
    const state = createInitialReversiState();
    const board = new Array(64).fill(EMPTY);
    board[1] = 2; // White
    board[2] = 1; // Black
    // Also provide another legal move for Black that doesn't take a corner:
    // e.g. Black at 27, White at 28, Black at 35, White at 36
    board[27] = 2;
    board[28] = 1;
    board[35] = 1;
    board[36] = 2;

    state.board = board;
    state.turn = 1;
    state.blackCount = 3;
    state.whiteCount = 3;

    const result = engine.search(state, {
      maxDepth: 2,
      deterministic: true,
    });

    // Square 0 is a corner (+100 positional + corner bonus), AI MUST play 0
    expect(result.bestMove.square).toBe(0);
  });

  it('successfully computes search across all difficulty levels (1..5)', () => {
    const state = createInitialReversiState();

    for (let lvl = 1; lvl <= 5; lvl++) {
      const config = DIFFICULTY_CONFIGS[lvl as 1 | 2 | 3 | 4 | 5];
      const result = engine.search(state, {
        ...config,
        deterministic: true,
      });

      expect(result.bestMove).toBeDefined();
      expect([19, 26, 37, 44]).toContain(result.bestMove.square);
      expect(result.nodesEvaluated).toBeGreaterThan(0);
    }
  });
});
