import { describe, expect, it } from 'vitest';
import { createInitialReversiState } from '../../../src/games/reversi/board';
import {
  countFrontierDiscs,
  evaluateReversiState,
  isReversiTacticalMove,
  orderReversiMoves,
} from '../../../src/games/reversi/evaluator';
import { EMPTY } from '../../../src/games/reversi/types';

describe('Reversi - Evaluator & Move Ordering (TASK-403)', () => {
  it('evaluates initial balanced position symmetrically to 0', () => {
    const state = createInitialReversiState();
    expect(evaluateReversiState(state, 1)).toBe(0);
    expect(evaluateReversiState(state, 2)).toBe(0);
  });

  it('rewards corner occupation with substantial positive score', () => {
    const state = createInitialReversiState();
    // Award Black top-left corner (square 0)
    state.board[0] = 1;
    state.blackCount = 3;

    const score = evaluateReversiState(state, 1);
    expect(score).toBeGreaterThan(200);
  });

  it('penalizes X-square occupation when the adjacent corner is empty', () => {
    const state = createInitialReversiState();
    // Square 9 is X-square adjacent to vacant corner 0
    state.board[9] = 1;
    state.blackCount = 3;

    const score = evaluateReversiState(state, 1);
    expect(score).toBeLessThan(-20);
  });

  it('nullifies X-square penalty if the adjacent corner is already owned', () => {
    const state = createInitialReversiState();
    state.board[0] = 1; // Owns corner
    state.board[9] = 1; // Owns X-square adjacent to owned corner
    state.blackCount = 4;

    const score = evaluateReversiState(state, 1);
    // Should be strongly positive because corner + adjacent is stable
    expect(score).toBeGreaterThan(250);
  });

  it('calculates frontier discs correctly', () => {
    const board = new Array(64).fill(EMPTY);
    // Square 27 (d4) surrounded by empty squares -> frontier
    board[27] = 1;
    expect(countFrontierDiscs(board, 1)).toBe(1);

    // Create a 3x3 block of Black discs from col 1..3, row 1..3
    // Indices: 9, 10, 11, 17, 18, 19, 25, 26, 27
    // Center disc is 18 (col 2, row 2). All 8 neighbors are Black!
    // So 18 is NOT a frontier disc; the other 8 are frontier discs.
    for (const r of [1, 2, 3]) {
      for (const c of [1, 2, 3]) {
        board[r * 8 + c] = 1;
      }
    }
    // 9 discs total, 8 on frontier, 1 interior
    expect(countFrontierDiscs(board, 1)).toBe(8);
  });

  it('orders moves prioritizing corners over dangerous squares', () => {
    const moves = [
      { square: 9 }, // X-square (-50)
      { square: 0 }, // Corner (+100)
      { square: 27 }, // Center (0)
      { square: 2 }, // Edge (+10)
    ];
    const ordered = orderReversiMoves(moves, createInitialReversiState());
    expect(ordered.map((m) => m.square)).toEqual([0, 2, 27, 9]);
  });

  it('identifies tactical moves correctly', () => {
    expect(isReversiTacticalMove({ square: 0 })).toBe(true); // Corner
    expect(isReversiTacticalMove({ square: 63 })).toBe(true); // Corner
    expect(isReversiTacticalMove({ square: 20, flippedSquares: [27, 28, 29, 30, 31] })).toBe(true); // >= 5 flips
    expect(isReversiTacticalMove({ square: 19, flippedSquares: [27] })).toBe(false); // 1 flip
  });

  it('evaluates terminal win and loss appropriately', () => {
    const wonState = createInitialReversiState();
    wonState.winner = 1;
    wonState.blackCount = 40;
    wonState.whiteCount = 24;

    const lossState = createInitialReversiState();
    lossState.winner = 2;
    lossState.blackCount = 20;
    lossState.whiteCount = 44;

    expect(evaluateReversiState(wonState, 1)).toBe(100000 + (40 - 24) * 100);
    expect(evaluateReversiState(lossState, 1)).toBe(-(100000 + (44 - 20) * 100));
  });
});
