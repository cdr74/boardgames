import { describe, expect, it } from 'vitest';
import { reversiGameDefinition } from '../../../src/games/reversi/definition';
import { createInitialReversiState } from '../../../src/games/reversi/board';
import { GenericMinimaxEngine } from '../../../src/platform/engine/minimax';
import { DIFFICULTY_CONFIGS } from '../../../src/platform/engine/difficulty';

describe('Reversi - Engine Variability & Determinism', () => {
  const engine = new GenericMinimaxEngine(reversiGameDefinition);

  it('yields identical moves on deterministic Level 3 search', () => {
    const state = createInitialReversiState();
    const config = DIFFICULTY_CONFIGS[3];

    const result1 = engine.search(state, { ...config, maxDepth: 3, deterministic: true });
    const result2 = engine.search(state, { ...config, maxDepth: 3, deterministic: true });

    expect(result1.bestMove.square).toBe(result2.bestMove.square);
    expect(result1.score).toBe(result2.score);
  });

  it('exhibits move variability on Level 1 (Beginner) across multiple iterations', () => {
    const state = createInitialReversiState();
    const config = DIFFICULTY_CONFIGS[1];

    const chosenSquares = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const result = engine.search(state, {
        ...config,
        deterministic: false,
      });
      chosenSquares.add(result.bestMove.square);
    }

    // In Level 1, with epsilon candidate pool and blunder factor, AI should explore multiple opening moves
    expect(chosenSquares.size).toBeGreaterThan(1);
  });
});
