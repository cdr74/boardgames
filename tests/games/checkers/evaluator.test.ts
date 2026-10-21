import { describe, expect, it } from 'vitest';
import {
  BLACK_KING,
  BLACK_MAN,
  CheckersState,
  EMPTY,
  evaluateState,
  MATERIAL_KING_WEIGHT,
  MATERIAL_MAN_WEIGHT,
  PieceValue,
  TOTAL_SQUARES,
  WHITE_MAN,
} from '../../../src/games/checkers';

function createCustomBoard(placements: Record<number, PieceValue>): PieceValue[] {
  const board: PieceValue[] = new Array(TOTAL_SQUARES).fill(EMPTY);
  for (const [sq, piece] of Object.entries(placements)) {
    board[Number(sq)] = piece;
  }
  return board;
}

describe('Checkers Heuristic Evaluator (ADR-0007 / TASK-204)', () => {
  it('evaluates terminal winning, losing, and draw states', () => {
    const board = createCustomBoard({ 1: BLACK_KING });

    const winningState: CheckersState = {
      board,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: 1,
    };
    expect(evaluateState(winningState, 1)).toBe(100000);
    expect(evaluateState(winningState, 2)).toBe(-100000);

    const drawState: CheckersState = {
      board,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 80,
      history: [],
      winner: 'draw',
      winReason: 'forty_move_rule',
    };
    expect(evaluateState(drawState, 1)).toBe(0);
    expect(evaluateState(drawState, 2)).toBe(0);
  });

  it('values King significantly higher than Man (175 vs 100)', () => {
    // Both pieces on home row (row 7) where rank advancement is 0 for both
    const boardWithMan = createCustomBoard({
      29: BLACK_MAN, // row 7, col 2
      0: WHITE_MAN,  // row 0, col 1
    });

    const boardWithKing = createCustomBoard({
      29: BLACK_KING, // King instead of Man
      0: WHITE_MAN,
    });

    const stateMan: CheckersState = {
      board: boardWithMan,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    const stateKing: CheckersState = {
      board: boardWithKing,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    const evalMan = evaluateState(stateMan, 1);
    const evalKing = evaluateState(stateKing, 1);

    // Difference must be at least the material advantage (+75) plus king backward mobility
    expect(evalKing).toBeGreaterThanOrEqual(evalMan + (MATERIAL_KING_WEIGHT - MATERIAL_MAN_WEIGHT));
  });

  it('rewards rank advancement for men towards king row (+3 per rank)', () => {
    // Black man at row 2 (sq 9) vs Black man at row 5 (sq 21)
    // sq 9 has advancement 7 - 2 = 5 ranks (15 pts)
    // sq 21 has advancement 7 - 5 = 2 ranks (6 pts)
    // Difference is (5 - 2) * 3 = 9 pts
    const boardAdvanced = createCustomBoard({
      9: BLACK_MAN, // row 2, col 3 (center)
      0: WHITE_MAN, // row 0, col 1 (home)
    });

    const boardRetracted = createCustomBoard({
      21: BLACK_MAN, // row 5, col 2 (center)
      0: WHITE_MAN,  // row 0, col 1 (home)
    });

    const stateAdv: CheckersState = {
      board: boardAdvanced,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    const stateRet: CheckersState = {
      board: boardRetracted,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    // Both sq 9 and sq 21 are center squares; rank advancement is the key differentiator
    expect(evaluateState(stateAdv, 1)).toBeGreaterThan(evaluateState(stateRet, 1));
  });

  it('rewards center control squares (sq 9, 10, 13, 14, 17, 18, 21, 22)', () => {
    // Compare Black piece on center square 14 (row 3, col 4) vs non-center square 15 (row 3, col 6)
    // Both are at row 3, neither on edge (col 4 vs col 6), identical rank advancement
    const boardCenter = createCustomBoard({
      14: BLACK_MAN, // center
      0: WHITE_MAN,
    });

    const boardNonCenter = createCustomBoard({
      15: BLACK_MAN, // non-center
      0: WHITE_MAN,
    });

    const stateCenter: CheckersState = {
      board: boardCenter,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    const stateNonCenter: CheckersState = {
      board: boardNonCenter,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    const centerScore = evaluateState(stateCenter, 1);
    const nonCenterScore = evaluateState(stateNonCenter, 1);

    expect(centerScore).toBeGreaterThan(nonCenterScore);
  });

  it('rewards back-row defense for pieces on their home row', () => {
    // Black piece on home row (sq 29, row 7) vs row 6 (sq 25, row 6)
    const boardDefended = createCustomBoard({
      29: BLACK_MAN, // row 7 (home row) -> receives back-row defense bonus
      0: WHITE_MAN,
    });

    const stateDefended: CheckersState = {
      board: boardDefended,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    const boardUndefended = createCustomBoard({
      25: BLACK_MAN, // row 6 (not home row)
      0: WHITE_MAN,
    });

    const stateUndefended: CheckersState = {
      board: boardUndefended,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    // Sq 29 has back row bonus (+12), 0 advancement
    // Sq 25 has 0 back row bonus, 1 rank advancement (+3)
    // Net difference should favor home row defense by ~9 points (modulo mobility)
    expect(evaluateState(stateDefended, 1)).toBeGreaterThan(evaluateState(stateUndefended, 1));
  });

  it('penalizes edge squares for men', () => {
    // Black piece at square 12 (row 3, col 0 - edge) vs square 13 (row 3, col 2 - non-edge)
    const boardEdge = createCustomBoard({
      12: BLACK_MAN, // col 0 edge
      0: WHITE_MAN,
    });

    const boardInner = createCustomBoard({
      13: BLACK_MAN, // col 2 inner
      0: WHITE_MAN,
    });

    const stateEdge: CheckersState = {
      board: boardEdge,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    const stateInner: CheckersState = {
      board: boardInner,
      turn: 1,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    expect(evaluateState(stateInner, 1)).toBeGreaterThan(evaluateState(stateEdge, 1));
  });
});
