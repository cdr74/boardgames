import { describe, expect, it } from 'vitest';
import {
  BLACK_KING,
  BLACK_MAN,
  coordFromIndex,
  countPieces,
  createInitialCheckersState,
  crownPiece,
  EMPTY,
  getOpponent,
  getPiecePlayer,
  indexFromCoord,
  isBlack,
  isKing,
  isKingRow,
  isMan,
  isWhite,
  JUMP_NEIGHBORS,
  SQUARE_COORDS,
  STEP_NEIGHBORS,
  WHITE_KING,
  WHITE_MAN,
} from '../../../src/games/checkers';

describe('Checkers Board Representation & Geometry (ADR-0007 / TASK-202)', () => {
  it('maps all 32 dark square coordinates accurately between 1D index and 2D (row, col)', () => {
    expect(SQUARE_COORDS).toHaveLength(32);

    for (let i = 0; i < 32; i++) {
      const coord = coordFromIndex(i);
      expect(coord.index).toBe(i);
      expect(coord.row).toBeGreaterThanOrEqual(0);
      expect(coord.row).toBeLessThan(8);
      expect(coord.col).toBeGreaterThanOrEqual(0);
      expect(coord.col).toBeLessThan(8);

      // Dark square invariant: (row + col) % 2 === 1
      expect((coord.row + coord.col) % 2).toBe(1);

      // Round-trip indexing
      expect(indexFromCoord(coord.row, coord.col)).toBe(i);
    }

    // Light squares must return -1
    expect(indexFromCoord(0, 0)).toBe(-1);
    expect(indexFromCoord(1, 1)).toBe(-1);
    expect(indexFromCoord(7, 7)).toBe(-1);

    // Out of bound coordinates must return -1
    expect(indexFromCoord(-1, 0)).toBe(-1);
    expect(indexFromCoord(8, 0)).toBe(-1);
    expect(indexFromCoord(0, -1)).toBe(-1);
    expect(indexFromCoord(0, 8)).toBe(-1);
  });

  it('correctly maps specific home and king row indices', () => {
    // Row 0 (White home / Black king row): cols 1, 3, 5, 7 -> indices 0, 1, 2, 3
    expect(coordFromIndex(0)).toEqual({ index: 0, row: 0, col: 1 });
    expect(coordFromIndex(1)).toEqual({ index: 1, row: 0, col: 3 });
    expect(coordFromIndex(2)).toEqual({ index: 2, row: 0, col: 5 });
    expect(coordFromIndex(3)).toEqual({ index: 3, row: 0, col: 7 });

    // Row 7 (Black home / White king row): cols 0, 2, 4, 6 -> indices 28, 29, 30, 31
    expect(coordFromIndex(28)).toEqual({ index: 28, row: 7, col: 0 });
    expect(coordFromIndex(29)).toEqual({ index: 29, row: 7, col: 2 });
    expect(coordFromIndex(30)).toEqual({ index: 30, row: 7, col: 4 });
    expect(coordFromIndex(31)).toEqual({ index: 31, row: 7, col: 6 });

    // King rows
    for (let i = 0; i <= 3; i++) {
      expect(isKingRow(1, i)).toBe(true);
      expect(isKingRow(2, i)).toBe(false);
    }
    for (let i = 28; i <= 31; i++) {
      expect(isKingRow(1, i)).toBe(false);
      expect(isKingRow(2, i)).toBe(true);
    }
  });

  it('initializes the board with 12 Black pieces and 12 White pieces in correct positions', () => {
    const state = createInitialCheckersState();
    expect(state.turn).toBe(1);
    expect(state.winner).toBeNull();
    expect(state.pliesWithoutCaptureOrManAdvance).toBe(0);
    expect(state.history).toHaveLength(1);

    const counts = countPieces(state.board);
    expect(counts.blackMen).toBe(12);
    expect(counts.blackKings).toBe(0);
    expect(counts.whiteMen).toBe(12);
    expect(counts.whiteKings).toBe(0);
    expect(counts.totalBlack).toBe(12);
    expect(counts.totalWhite).toBe(12);

    // Squares 0..11 are White men
    for (let i = 0; i < 12; i++) {
      expect(state.board[i]).toBe(WHITE_MAN);
      expect(isWhite(state.board[i])).toBe(true);
      expect(getPiecePlayer(state.board[i])).toBe(2);
    }

    // Squares 12..19 are Empty
    for (let i = 12; i < 20; i++) {
      expect(state.board[i]).toBe(EMPTY);
      expect(getPiecePlayer(state.board[i])).toBeNull();
    }

    // Squares 20..31 are Black men
    for (let i = 20; i < 32; i++) {
      expect(state.board[i]).toBe(BLACK_MAN);
      expect(isBlack(state.board[i])).toBe(true);
      expect(getPiecePlayer(state.board[i])).toBe(1);
    }
  });

  it('precomputes valid step and jump neighbors', () => {
    // Corner square 0 (row 0, col 1): can only step down-left (sq 4) or down-right (sq 5)
    const sq0Neighbors = STEP_NEIGHBORS[0];
    expect(sq0Neighbors.length).toBe(2);
    expect(sq0Neighbors.map((n) => n.to).sort((a, b) => a - b)).toEqual([4, 5]);

    // Square 4 (row 1, col 0): can step up-right (sq 0) or down-right (sq 8)
    const sq4Neighbors = STEP_NEIGHBORS[4];
    expect(sq4Neighbors.length).toBe(2);
    expect(sq4Neighbors.map((n) => n.to).sort((a, b) => a - b)).toEqual([0, 8]);

    // Center square 14 (row 3, col 4): has 4 diagonal step neighbors: (row 2, col 3=sq 9), (row 2, col 5=sq 10), (row 4, col 3=sq 17), (row 4, col 5=sq 18)
    const sq14Neighbors = STEP_NEIGHBORS[14];
    expect(sq14Neighbors.length).toBe(4);
    expect(sq14Neighbors.map((n) => n.to).sort((a, b) => a - b)).toEqual([9, 10, 17, 18]);

    // Jump from square 21 (row 5, col 2) over square 16 (row 4, col 1) lands on square 12 (row 3, col 0)
    const sq21Jumps = JUMP_NEIGHBORS[21];
    const upLeftJump = sq21Jumps.find((j) => j.over === 16);
    expect(upLeftJump).toBeDefined();
    expect(upLeftJump?.to).toBe(12);
  });

  it('handles piece crowning and player helpers', () => {
    expect(crownPiece(BLACK_MAN)).toBe(BLACK_KING);
    expect(crownPiece(WHITE_MAN)).toBe(WHITE_KING);
    expect(crownPiece(BLACK_KING)).toBe(BLACK_KING);
    expect(crownPiece(WHITE_KING)).toBe(WHITE_KING);

    expect(isKing(BLACK_KING)).toBe(true);
    expect(isKing(WHITE_KING)).toBe(true);
    expect(isKing(BLACK_MAN)).toBe(false);
    expect(isMan(BLACK_MAN)).toBe(true);
    expect(isMan(WHITE_KING)).toBe(false);

    expect(getOpponent(1)).toBe(2);
    expect(getOpponent(2)).toBe(1);
  });
});
