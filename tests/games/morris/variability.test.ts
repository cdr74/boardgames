import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../../src/games/morris/board';
import { morrisGameDefinition } from '../../../src/games/morris';
import { DIFFICULTY_CONFIGS } from '../../../src/platform/engine/difficulty';
import { GenericMinimaxEngine } from '../../../src/platform/engine/minimax';

describe('Engine Play Variability and Candidate Randomization', () => {
  const engine = new GenericMinimaxEngine(morrisGameDefinition);

  it('produces diverse opening moves across repeated matches from an empty board (Level 3)', () => {
    const openingMoves = new Set<number>();
    const trials = 12;

    for (let i = 0; i < trials; i++) {
      const state = createInitialGameState();
      const result = engine.search(state, {
        ...DIFFICULTY_CONFIGS[3],
        maxDepth: 2,
        timeLimitMs: 500,
      });

      expect(result.bestMove.type).toBe('place');
      openingMoves.add(result.bestMove.to);
    }

    // Must exhibit variety across multiple symmetrical opening points
    expect(openingMoves.size).toBeGreaterThan(1);
  });

  it('produces diverse opening moves at Level 5 (Master) across symmetric optimal points', () => {
    const openingMoves = new Set<number>();
    const trials = 10;

    for (let i = 0; i < trials; i++) {
      const state = createInitialGameState();
      const result = engine.search(state, {
        ...DIFFICULTY_CONFIGS[5],
        maxDepth: 2,
        timeLimitMs: 500,
      });

      expect(result.bestMove.type).toBe('place');
      openingMoves.add(result.bestMove.to);
    }

    // Level 5 breaks ties across optimal symmetry points (e.g. middle midpoints 9, 11, 13, 15)
    expect(openingMoves.size).toBeGreaterThan(1);
  });

  it('guarantees identical reproducible moves when deterministic mode is enabled', () => {
    const state = createInitialGameState();
    const results: number[] = [];

    for (let i = 0; i < 5; i++) {
      const res = engine.search(state, {
        ...DIFFICULTY_CONFIGS[3],
        maxDepth: 2,
        timeLimitMs: 500,
        deterministic: true,
      });
      results.push(res.bestMove.to);
    }

    // In deterministic mode, all runs must yield the exact same vertex
    expect(new Set(results).size).toBe(1);
  });

  it('never misses an immediate mill closure and capture despite candidate randomization', () => {
    const state = createInitialGameState();
    state.turn = 2; // Black to move
    state.board[0] = 2;
    state.board[1] = 2;
    state.blackPiecesOnBoard = 2;
    state.blackPiecesInHand = 7;
    state.board[4] = 1;
    state.whitePiecesOnBoard = 1;
    state.whitePiecesInHand = 8;

    // Run 10 times to verify stochastic tie-breaking never picks a non-capture
    for (let i = 0; i < 10; i++) {
      const result = engine.search(state, {
        ...DIFFICULTY_CONFIGS[3],
        maxDepth: 2,
        timeLimitMs: 500,
      });

      expect(result.bestMove.type).toBe('place');
      expect(result.bestMove.to).toBe(2);
      expect(result.bestMove.capture).toBe(4);
    }
  });

  it('never misses blocking opponent mill in movement phase across repeated trials', () => {
    const state = createInitialGameState();
    state.whitePiecesInHand = 0;
    state.blackPiecesInHand = 0;
    state.whitePiecesOnBoard = 4;
    state.blackPiecesOnBoard = 4;
    state.turn = 2; // Black to move

    // White threatens to slide 17 -> 9 to complete mill (8, 9, 10)
    state.board[8] = 1;
    state.board[10] = 1;
    state.board[17] = 1;
    state.board[1] = 2; // Black can slide 1 -> 9 to block

    state.board[4] = 1;
    state.board[12] = 2;
    state.board[14] = 2;
    state.board[20] = 2;

    for (let i = 0; i < 8; i++) {
      const result = engine.search(state, {
        ...DIFFICULTY_CONFIGS[3],
        maxDepth: 4,
        timeLimitMs: 1500,
      });

      expect(result.bestMove.from).toBe(1);
      expect(result.bestMove.to).toBe(9);
    }
  });
});
