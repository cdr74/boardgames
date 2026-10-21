import { describe, expect, it } from 'vitest';
import {
  cloneConnectFourState,
  coordToBitIndex,
  createInitialConnectFourState,
  findWinningCells,
  hasWonBitboard,
  serializeConnectFourState,
} from '../../../src/games/connect-four/board';
import { COLS, ROWS } from '../../../src/games/connect-four/constants';
import { EMPTY } from '../../../src/games/connect-four/types';

describe('Connect Four - Board & Bitboard State', () => {
  it('creates a clean initial state with 7x6 empty grid and zeroed heights', () => {
    const state = createInitialConnectFourState();
    expect(state.board.length).toBe(COLS);
    for (let c = 0; c < COLS; c++) {
      expect(state.board[c].length).toBe(ROWS);
      for (let r = 0; r < ROWS; r++) {
        expect(state.board[c][r]).toBe(EMPTY);
      }
    }
    expect(state.heights).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(state.bitboards).toEqual([0n, 0n]);
    expect(state.turn).toBe(1);
    expect(state.movesCount).toBe(0);
    expect(state.winner).toBeNull();
  });

  it('correctly deep-clones game state without mutation leaking', () => {
    const original = createInitialConnectFourState();
    const cloned = cloneConnectFourState(original);

    cloned.board[3][0] = 1;
    cloned.heights[3] = 1;
    cloned.bitboards[0] = 1n;
    cloned.turn = 2;
    cloned.movesCount = 1;

    expect(original.board[3][0]).toBe(EMPTY);
    expect(original.heights[3]).toBe(0);
    expect(original.bitboards[0]).toBe(0n);
    expect(original.turn).toBe(1);
    expect(original.movesCount).toBe(0);
  });

  it('computes bitboard indices using 7x7 stride scheme', () => {
    // col * 7 + row
    expect(coordToBitIndex(0, 0)).toBe(0n);
    expect(coordToBitIndex(0, 5)).toBe(5n);
    expect(coordToBitIndex(1, 0)).toBe(7n);
    expect(coordToBitIndex(3, 2)).toBe(23n);
    expect(coordToBitIndex(6, 5)).toBe(47n);
  });

  describe('O(1) Bitboard 4-in-a-Row Detection', () => {
    it('detects horizontal win', () => {
      // 4 discs in row 0 across cols 1, 2, 3, 4
      let bb = 0n;
      bb |= 1n << coordToBitIndex(1, 0);
      bb |= 1n << coordToBitIndex(2, 0);
      bb |= 1n << coordToBitIndex(3, 0);
      bb |= 1n << coordToBitIndex(4, 0);

      expect(hasWonBitboard(bb)).toBe(true);
    });

    it('detects vertical win', () => {
      // 4 discs in col 2, rows 1, 2, 3, 4
      let bb = 0n;
      bb |= 1n << coordToBitIndex(2, 1);
      bb |= 1n << coordToBitIndex(2, 2);
      bb |= 1n << coordToBitIndex(2, 3);
      bb |= 1n << coordToBitIndex(2, 4);

      expect(hasWonBitboard(bb)).toBe(true);
    });

    it('detects diagonal / win (up-right)', () => {
      // (1, 1), (2, 2), (3, 3), (4, 4)
      let bb = 0n;
      bb |= 1n << coordToBitIndex(1, 1);
      bb |= 1n << coordToBitIndex(2, 2);
      bb |= 1n << coordToBitIndex(3, 3);
      bb |= 1n << coordToBitIndex(4, 4);

      expect(hasWonBitboard(bb)).toBe(true);
    });

    it('detects diagonal \\ win (down-right)', () => {
      // (1, 4), (2, 3), (3, 2), (4, 1)
      let bb = 0n;
      bb |= 1n << coordToBitIndex(1, 4);
      bb |= 1n << coordToBitIndex(2, 3);
      bb |= 1n << coordToBitIndex(3, 2);
      bb |= 1n << coordToBitIndex(4, 1);

      expect(hasWonBitboard(bb)).toBe(true);
    });

    it('prevents column wrap-around through sentinel row 6', () => {
      // Two discs at top of col 0 (rows 4, 5) and two at bottom of col 1 (rows 0, 1)
      // They should NOT form a vertical 4-in-a-row
      let bb = 0n;
      bb |= 1n << coordToBitIndex(0, 4);
      bb |= 1n << coordToBitIndex(0, 5);
      bb |= 1n << coordToBitIndex(1, 0);
      bb |= 1n << coordToBitIndex(1, 1);

      expect(hasWonBitboard(bb)).toBe(false);
    });

    it('returns false when alignment has only 3 contiguous pieces', () => {
      let bb = 0n;
      bb |= 1n << coordToBitIndex(0, 0);
      bb |= 1n << coordToBitIndex(1, 0);
      bb |= 1n << coordToBitIndex(2, 0);

      expect(hasWonBitboard(bb)).toBe(false);
    });
  });

  describe('findWinningCells', () => {
    it('locates coordinates of horizontal win', () => {
      const state = createInitialConnectFourState();
      state.board[2][1] = 1;
      state.board[3][1] = 1;
      state.board[4][1] = 1;
      state.board[5][1] = 1;

      const cells = findWinningCells(state.board, 1);
      expect(cells).toEqual([
        { column: 2, row: 1 },
        { column: 3, row: 1 },
        { column: 4, row: 1 },
        { column: 5, row: 1 },
      ]);
    });

    it('locates coordinates of vertical win', () => {
      const state = createInitialConnectFourState();
      state.board[0][0] = 2;
      state.board[0][1] = 2;
      state.board[0][2] = 2;
      state.board[0][3] = 2;

      const cells = findWinningCells(state.board, 2);
      expect(cells).toEqual([
        { column: 0, row: 0 },
        { column: 0, row: 1 },
        { column: 0, row: 2 },
        { column: 0, row: 3 },
      ]);
    });

    it('returns null if no 4-in-a-row exists', () => {
      const state = createInitialConnectFourState();
      state.board[0][0] = 1;
      state.board[1][0] = 1;
      state.board[2][0] = 1;

      expect(findWinningCells(state.board, 1)).toBeNull();
    });
  });

  it('serializes game state unambiguously', () => {
    const state = createInitialConnectFourState();
    expect(serializeConnectFourState(state)).toBe('1:0:0');
  });
});
