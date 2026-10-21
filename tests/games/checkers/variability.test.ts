import { describe, expect, it } from 'vitest';
import {
  BLACK_MAN,
  checkersGameDefinition,
  CheckersState,
  createInitialCheckersState,
  EMPTY,
  PieceValue,
  TOTAL_SQUARES,
  WHITE_MAN,
} from '../../../src/games/checkers';
import { DIFFICULTY_CONFIGS } from '../../../src/platform/engine/difficulty';
import { GenericMinimaxEngine } from '../../../src/platform/engine/minimax';

function createCustomBoard(placements: Record<number, PieceValue>): PieceValue[] {
  const board: PieceValue[] = new Array(TOTAL_SQUARES).fill(EMPTY);
  for (const [sq, piece] of Object.entries(placements)) {
    board[Number(sq)] = piece;
  }
  return board;
}

describe('Checkers Engine Variability and Candidate Randomization (TASK-208)', () => {
  const engine = new GenericMinimaxEngine(checkersGameDefinition);

  it('produces diverse opening moves across repeated trials from initial board (Level 3)', () => {
    const openingMoves = new Set<string>();
    const trials = 15;

    for (let i = 0; i < trials; i++) {
      const state = createInitialCheckersState();
      const result = engine.search(state, {
        ...DIFFICULTY_CONFIGS[3],
        maxDepth: 2,
        timeLimitMs: 400,
      });

      openingMoves.add(`${result.bestMove.from}->${result.bestMove.to}`);
    }

    // Must exhibit variety across opening moves in checkers
    expect(openingMoves.size).toBeGreaterThan(1);
  });

  it('guarantees identical reproducible moves when deterministic mode is enabled', () => {
    const state = createInitialCheckersState();
    const results: string[] = [];

    for (let i = 0; i < 5; i++) {
      const res = engine.search(state, {
        ...DIFFICULTY_CONFIGS[3],
        maxDepth: 2,
        timeLimitMs: 400,
        deterministic: true,
      });
      results.push(`${res.bestMove.from}->${res.bestMove.to}`);
    }

    // All runs in deterministic mode must yield the exact same move
    expect(new Set(results).size).toBe(1);
  });

  it('never misses a mandatory capture despite candidate randomization', () => {
    // Black piece at 17, White piece at 14. Black MUST jump 17 -> 10.
    // Also pieces at 20, 21, 22 that have quiet moves available if captures weren't enforced.
    const board = createCustomBoard({
      17: BLACK_MAN,
      20: BLACK_MAN,
      21: BLACK_MAN,
      14: WHITE_MAN,
      0: WHITE_MAN,
    });

    const state: CheckersState = {
      board,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    // Run 10 times with stochastic sampling enabled (epsilon > 0)
    for (let i = 0; i < 10; i++) {
      const result = engine.search(state, {
        ...DIFFICULTY_CONFIGS[3],
        maxDepth: 2,
        timeLimitMs: 400,
      });

      expect(result.bestMove.isJump).toBe(true);
      expect(result.bestMove.from).toBe(17);
      expect(result.bestMove.to).toBe(10);
      expect(result.bestMove.captures).toEqual([14]);
    }
  });

  it('allows blunder variability on Level 1 (Beginner)', () => {
    const state = createInitialCheckersState();
    const moves = new Set<string>();

    for (let i = 0; i < 15; i++) {
      const res = engine.search(state, {
        difficulty: 1,
        maxDepth: 1,
        deterministic: false,
      });
      moves.add(`${res.bestMove.from}->${res.bestMove.to}`);
    }

    expect(moves.size).toBeGreaterThan(1);
  });
});
