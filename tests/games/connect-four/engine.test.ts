import { describe, expect, it } from 'vitest';
import { connectFourGameDefinition } from '../../../src/games/connect-four/definition';
import { createInitialConnectFourState } from '../../../src/games/connect-four/board';
import { applyMove } from '../../../src/games/connect-four/rules';
import { GenericMinimaxEngine } from '../../../src/platform/engine/minimax';
import { DIFFICULTY_CONFIGS } from '../../../src/platform/engine/difficulty';

describe('Connect Four - Generic Minimax Engine Search', () => {
  const engine = new GenericMinimaxEngine(connectFourGameDefinition);

  it('selects the center column or near-center on opening move at Medium depth', () => {
    const initialState = createInitialConnectFourState();
    const result = engine.search(initialState, {
      maxDepth: 3,
      deterministic: true,
    });

    expect(result.bestMove).toBeDefined();
    // Center column 3 has highest positional weight
    expect(result.bestMove.column).toBe(3);
    expect(result.bestMove.row).toBe(0);
    expect(result.depthReached).toBeGreaterThanOrEqual(3);
  });

  it('immediately takes a winning move when available (Level 3/4/5)', () => {
    let state = createInitialConnectFourState();
    // P1 has 3 pieces horizontally at row 0: (1,0), (2,0), (3,0)
    state = applyMove(state, { column: 1, row: 0 }); // P1
    state = applyMove(state, { column: 1, row: 1 }); // P2
    state = applyMove(state, { column: 2, row: 0 }); // P1
    state = applyMove(state, { column: 2, row: 1 }); // P2
    state = applyMove(state, { column: 3, row: 0 }); // P1
    state = applyMove(state, { column: 3, row: 1 }); // P2

    // Now P1 to move. Winning moves exist at col 0 or col 4.
    expect(state.turn).toBe(1);

    const result = engine.search(state, {
      maxDepth: 2,
      deterministic: true,
    });

    // Winning column must be either 0 or 4 (completing 4-in-a-row)
    expect([0, 4]).toContain(result.bestMove.column);
    expect(result.score).toBeGreaterThan(90000);
  });

  it('blocks opponent from winning on the very next turn', () => {
    let state = createInitialConnectFourState();
    // P1 builds 3 vertical discs in column 2: (2,0), (2,1), (2,2)
    state = applyMove(state, { column: 2, row: 0 }); // P1 (2,0)
    state = applyMove(state, { column: 5, row: 0 }); // P2 (5,0)
    state = applyMove(state, { column: 2, row: 1 }); // P1 (2,1)
    state = applyMove(state, { column: 5, row: 1 }); // P2 (5,1)
    state = applyMove(state, { column: 2, row: 2 }); // P1 (2,2) -> threatens (2,3)!

    // Now P2's turn. P2 MUST play in column 2 (row 3) to prevent P1 from winning.
    expect(state.turn).toBe(2);

    const result = engine.search(state, {
      ...DIFFICULTY_CONFIGS[3],
      deterministic: true,
    });

    expect(result.bestMove.column).toBe(2);
    expect(result.bestMove.row).toBe(3);
  });

  it('successfully computes search across all difficulty levels (1..5)', () => {
    const state = createInitialConnectFourState();

    for (let lvl = 1; lvl <= 5; lvl++) {
      const config = DIFFICULTY_CONFIGS[lvl as 1 | 2 | 3 | 4 | 5];
      const result = engine.search(state, {
        ...config,
        deterministic: true,
      });

      expect(result.bestMove).toBeDefined();
      expect(result.bestMove.column).toBeGreaterThanOrEqual(0);
      expect(result.bestMove.column).toBeLessThan(7);
      expect(result.nodesEvaluated).toBeGreaterThan(0);
    }
  });
});
