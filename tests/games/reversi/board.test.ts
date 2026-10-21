import { describe, expect, it } from 'vitest';
import {
  cloneReversiState,
  coordFromIndex,
  countDiscs,
  createInitialBoard,
  createInitialReversiState,
  indexFromCoord,
  isInsideBoard,
  serializeReversiState,
} from '../../../src/games/reversi/board';
import { TOTAL_SQUARES } from '../../../src/games/reversi/constants';
import { EMPTY } from '../../../src/games/reversi/types';

describe('Reversi - Board State & Coordinates (TASK-402)', () => {
  it('creates clean initial 64-square board with standard Othello center cross', () => {
    const board = createInitialBoard();
    expect(board.length).toBe(TOTAL_SQUARES);

    // Initial 4 center discs
    // d4 (col 3, row 3 -> 27) = White (2)
    // e4 (col 4, row 3 -> 28) = Black (1)
    // d5 (col 3, row 4 -> 35) = Black (1)
    // e5 (col 4, row 4 -> 36) = White (2)
    expect(board[27]).toBe(2);
    expect(board[28]).toBe(1);
    expect(board[35]).toBe(1);
    expect(board[36]).toBe(2);

    const counts = countDiscs(board);
    expect(counts.black).toBe(2);
    expect(counts.white).toBe(2);
    expect(counts.empty).toBe(60);
  });

  it('creates clean initial state with Black to move', () => {
    const state = createInitialReversiState();
    expect(state.turn).toBe(1);
    expect(state.blackCount).toBe(2);
    expect(state.whiteCount).toBe(2);
    expect(state.movesCount).toBe(0);
    expect(state.isPass).toBe(false);
    expect(state.winner).toBeNull();
  });

  it('correctly maps between 1D indices and 2D (col, row) coordinates', () => {
    expect(indexFromCoord(0, 0)).toBe(0);
    expect(indexFromCoord(7, 0)).toBe(7);
    expect(indexFromCoord(0, 7)).toBe(56);
    expect(indexFromCoord(7, 7)).toBe(63);
    expect(indexFromCoord(3, 4)).toBe(35);

    expect(coordFromIndex(0)).toEqual({ col: 0, row: 0 });
    expect(coordFromIndex(7)).toEqual({ col: 7, row: 0 });
    expect(coordFromIndex(56)).toEqual({ col: 0, row: 7 });
    expect(coordFromIndex(63)).toEqual({ col: 7, row: 7 });
    expect(coordFromIndex(35)).toEqual({ col: 3, row: 4 });
  });

  it('validates board boundaries', () => {
    expect(isInsideBoard(0, 0)).toBe(true);
    expect(isInsideBoard(7, 7)).toBe(true);
    expect(isInsideBoard(-1, 0)).toBe(false);
    expect(isInsideBoard(0, 8)).toBe(false);
  });

  it('deep clones state without memory leakage', () => {
    const original = createInitialReversiState();
    const cloned = cloneReversiState(original);

    cloned.board[0] = 1;
    cloned.blackCount = 3;
    cloned.turn = 2;

    expect(original.board[0]).toBe(EMPTY);
    expect(original.blackCount).toBe(2);
    expect(original.turn).toBe(1);
  });

  it('serializes state string unambiguously', () => {
    const state = createInitialReversiState();
    const serialized = serializeReversiState(state);
    expect(serialized.startsWith('1:_:')).toBe(true);
    expect(serialized.length).toBe(4 + 64);
  });
});
