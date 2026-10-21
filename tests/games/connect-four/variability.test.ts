import { describe, expect, it } from 'vitest';
import { connectFourGameDefinition } from '../../../src/games/connect-four/definition';
import { createInitialConnectFourState } from '../../../src/games/connect-four/board';
import { GenericMinimaxEngine } from '../../../src/platform/engine/minimax';
import { DIFFICULTY_CONFIGS } from '../../../src/platform/engine/difficulty';

describe('Connect Four - Search Variability & Difficulty Scaling', () => {
  const engine = new GenericMinimaxEngine(connectFourGameDefinition);

  it('yields identical moves on deterministic Level 5 search', () => {
    const state = createInitialConnectFourState();
    const config = DIFFICULTY_CONFIGS[5];

    const result1 = engine.search(state, { ...config, deterministic: true });
    const result2 = engine.search(state, { ...config, deterministic: true });

    expect(result1.bestMove.column).toBe(result2.bestMove.column);
    expect(result1.score).toBe(result2.score);
  });

  it('exhibits move variability on Level 1 (Beginner) across multiple iterations', () => {
    const state = createInitialConnectFourState();
    const config = DIFFICULTY_CONFIGS[1];

    const selectedCols = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const result = engine.search(state, {
        ...config,
        deterministic: false,
      });
      selectedCols.add(result.bestMove.column);
    }

    // In Level 1, with epsilon pool and blunder rate, AI should sample multiple distinct columns
    expect(selectedCols.size).toBeGreaterThan(1);
  });
});
