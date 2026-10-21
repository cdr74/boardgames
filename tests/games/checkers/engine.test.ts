import { describe, expect, it } from 'vitest';
import {
  BLACK_KING,
  BLACK_MAN,
  checkersGameDefinition,
  CheckersState,
  createInitialCheckersState,
  EMPTY,
  PieceValue,
  TOTAL_SQUARES,
  WHITE_KING,
  WHITE_MAN,
} from '../../../src/games/checkers';
import { GenericMinimaxEngine } from '../../../src/platform/engine/minimax';

function createCustomBoard(placements: Record<number, PieceValue>): PieceValue[] {
  const board: PieceValue[] = new Array(TOTAL_SQUARES).fill(EMPTY);
  for (const [sq, piece] of Object.entries(placements)) {
    board[Number(sq)] = piece;
  }
  return board;
}

describe('Checkers Minimax Engine Integration (ADR-0007 / TASK-205)', () => {
  const engine = new GenericMinimaxEngine(checkersGameDefinition);

  it('initializes engine and executes search on the initial board state', () => {
    const initialState = createInitialCheckersState();
    const result = engine.search(initialState, {
      maxDepth: 2,
      deterministic: true,
    });

    expect(result).toBeDefined();
    expect(result.bestMove).toBeDefined();
    expect(result.bestMove.from).toBeGreaterThanOrEqual(20);
    expect(result.bestMove.from).toBeLessThanOrEqual(23);
    expect(result.depthReached).toBeGreaterThanOrEqual(1);
    expect(result.nodesEvaluated).toBeGreaterThan(0);
  });

  it('finds and executes a mandatory capture move at depth 1', () => {
    // Black piece at 17, White piece at 14, White piece at 0.
    // Black must capture 17 -> 10 over 14.
    const board = createCustomBoard({
      17: BLACK_MAN,
      28: BLACK_MAN,
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

    const result = engine.search(state, {
      maxDepth: 1,
      deterministic: true,
    });

    expect(result.bestMove.isJump).toBe(true);
    expect(result.bestMove.from).toBe(17);
    expect(result.bestMove.to).toBe(10);
    expect(result.bestMove.captures).toEqual([14]);
  });

  it('prioritizes a multi-jump that captures 2 pieces over a single jump', () => {
    // Black piece at 22 can double jump (over 17 to 13, over 9 to 6).
    // Black piece at 20 can single jump (over 16 to 11).
    const board = createCustomBoard({
      22: BLACK_MAN,
      20: BLACK_MAN,
      17: WHITE_MAN,
      9: WHITE_MAN,
      16: WHITE_MAN,
      0: WHITE_KING,
    });

    const state: CheckersState = {
      board,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    const result = engine.search(state, {
      maxDepth: 2,
      deterministic: true,
    });

    expect(result.bestMove.isJump).toBe(true);
    expect(result.bestMove.from).toBe(22);
    expect(result.bestMove.to).toBe(6);
    expect(result.bestMove.captures).toEqual([17, 9]);
  });

  it('orders moves with tactical captures and multi-jumps first', () => {
    const board = createCustomBoard({
      22: BLACK_MAN,
      17: WHITE_MAN,
      9: WHITE_MAN,
      23: BLACK_MAN,
      30: BLACK_KING,
    });

    const state: CheckersState = {
      board,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    const moves = checkersGameDefinition.getLegalMoves(state);
    const ordered = checkersGameDefinition.orderMoves!(moves, state, true);

    expect(ordered.length).toBeGreaterThan(0);
    // Since a jump is available, all legal moves are jumps
    expect(ordered[0].isJump).toBe(true);
  });

  it('executes searches cleanly across multiple difficulty configurations', () => {
    const initialState = createInitialCheckersState();

    // Level 1: Beginner (1-ply)
    const resL1 = engine.search(initialState, {
      difficulty: 1,
      maxDepth: 1,
      deterministic: true,
    });
    expect(resL1.bestMove).toBeDefined();

    // Level 2: Easy (2-ply)
    const resL2 = engine.search(initialState, {
      difficulty: 2,
      maxDepth: 2,
      deterministic: true,
    });
    expect(resL2.bestMove).toBeDefined();

    // Level 3: Medium (3-ply)
    const resL3 = engine.search(initialState, {
      difficulty: 3,
      maxDepth: 3,
      deterministic: true,
    });
    expect(resL3.bestMove).toBeDefined();
    expect(resL3.depthReached).toBeGreaterThanOrEqual(2);
  });
});
