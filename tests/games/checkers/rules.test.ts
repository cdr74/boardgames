import { describe, expect, it } from 'vitest';
import {
  applyMove,
  BLACK_KING,
  BLACK_MAN,
  checkGameOver,
  CheckersState,
  createInitialCheckersState,
  EMPTY,
  getLegalMoves,
  PieceValue,
  TOTAL_SQUARES,
  WHITE_KING,
  WHITE_MAN,
} from '../../../src/games/checkers';

function createCustomBoard(placements: Record<number, PieceValue>): PieceValue[] {
  const board: PieceValue[] = new Array(TOTAL_SQUARES).fill(EMPTY);
  for (const [sq, piece] of Object.entries(placements)) {
    board[Number(sq)] = piece;
  }
  return board;
}

describe('Checkers Move Generation & Game Rules (ADR-0007 / TASK-203)', () => {
  describe('Initial Board Legal Moves', () => {
    it('generates exactly the 7 standard opening moves for Black (Player 1)', () => {
      const state = createInitialCheckersState();
      const moves = getLegalMoves(state);

      expect(moves).toHaveLength(7);
      expect(moves.every((m) => !m.isJump)).toBe(true);
      expect(moves.every((m) => m.captures.length === 0)).toBe(true);
      expect(moves.every((m) => !m.crowned)).toBe(true);

      // Verify source squares: 20 (1 move), 21 (2 moves), 22 (2 moves), 23 (2 moves)
      const fromCounts = moves.reduce<Record<number, number>>((acc, m) => {
        acc[m.from] = (acc[m.from] || 0) + 1;
        return acc;
      }, {});

      expect(fromCounts[20]).toBe(1); // sq 20 (row 5, col 0) -> sq 16 (row 4, col 1)
      expect(fromCounts[21]).toBe(2); // sq 21 (row 5, col 2) -> sq 16, 17
      expect(fromCounts[22]).toBe(2); // sq 22 (row 5, col 4) -> sq 17, 18
      expect(fromCounts[23]).toBe(2); // sq 23 (row 5, col 6) -> sq 18, 19
    });

    it('applies a simple move, switches turn to White, and generates White opening responses', () => {
      const state = createInitialCheckersState();
      const blackMove = getLegalMoves(state).find((m) => m.from === 21 && m.to === 17)!;
      expect(blackMove).toBeDefined();

      const nextState = applyMove(state, blackMove);
      expect(nextState.turn).toBe(2);
      expect(nextState.board[21]).toBe(EMPTY);
      expect(nextState.board[17]).toBe(BLACK_MAN);
      expect(nextState.pliesWithoutCaptureOrManAdvance).toBe(0); // Man advance resets counter

      const whiteMoves = getLegalMoves(nextState);
      expect(whiteMoves).toHaveLength(7);
      expect(whiteMoves.every((m) => !m.isJump)).toBe(true);
    });
  });

  describe('Mandatory Captures', () => {
    it('enforces mandatory jump: excludes all simple moves when a jump is available', () => {
      // Black man at 17, White man at 14, Landing sq 10 is empty.
      // Other pieces on board that could otherwise move quietly.
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

      const moves = getLegalMoves(state);
      expect(moves).toHaveLength(1);
      expect(moves[0].isJump).toBe(true);
      expect(moves[0].from).toBe(17);
      expect(moves[0].to).toBe(10);
      expect(moves[0].captures).toEqual([14]);
    });

    it('executes a single jump and captures the opponent piece', () => {
      const board = createCustomBoard({
        17: BLACK_MAN,
        14: WHITE_MAN,
      });

      const state: CheckersState = {
        board,
        turn: 1,
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const move = getLegalMoves(state)[0];
      const nextState = applyMove(state, move);

      expect(nextState.board[17]).toBe(EMPTY);
      expect(nextState.board[14]).toBe(EMPTY); // Captured
      expect(nextState.board[10]).toBe(BLACK_MAN);
      expect(nextState.turn).toBe(2);
    });

    it('allows player to choose between multiple pieces that have legal jumps', () => {
      // Both Black piece at 17 and Black piece at 19 can jump White pieces
      const board = createCustomBoard({
        17: BLACK_MAN,
        19: BLACK_MAN,
        14: WHITE_MAN,
        15: WHITE_MAN,
      });

      const state: CheckersState = {
        board,
        turn: 1,
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const moves = getLegalMoves(state);
      expect(moves).toHaveLength(2);
      expect(moves.map((m) => m.from).sort((a, b) => a - b)).toEqual([17, 19]);
    });
  });

  describe('Multi-Jump Sequences', () => {
    it('generates and completes a double jump in a single turn', () => {
      // Black man at 22 (row 5, col 4)
      // Hop 1: jumps White man at 17 (row 4, col 3) to square 13 (row 3, col 2)
      // Hop 2: from 13, jumps White man at 9 (row 2, col 3) to square 6 (row 1, col 4)
      const board = createCustomBoard({
        22: BLACK_MAN,
        17: WHITE_MAN,
        9: WHITE_MAN,
      });

      const state: CheckersState = {
        board,
        turn: 1,
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const moves = getLegalMoves(state);
      expect(moves).toHaveLength(1);
      const doubleJump = moves[0];

      expect(doubleJump.from).toBe(22);
      expect(doubleJump.to).toBe(6);
      expect(doubleJump.path).toEqual([22, 13, 6]);
      expect(doubleJump.captures).toEqual([17, 9]);

      const nextState = applyMove(state, doubleJump);
      expect(nextState.board[22]).toBe(EMPTY);
      expect(nextState.board[17]).toBe(EMPTY);
      expect(nextState.board[9]).toBe(EMPTY);
      expect(nextState.board[13]).toBe(EMPTY);
      expect(nextState.board[6]).toBe(BLACK_MAN);
      expect(nextState.turn).toBe(2);
    });

    it('generates multiple branching paths for a multi-jump sequence', () => {
      // Black man at 22:
      // Hop 1: jumps 17 to 13.
      // From 13, there are two opponent pieces: at 8 (row 2, col 1) and at 9 (row 2, col 3).
      // Both landing squares (4 and 6) are empty.
      const board = createCustomBoard({
        22: BLACK_MAN,
        17: WHITE_MAN,
        8: WHITE_MAN,
        9: WHITE_MAN,
      });

      const state: CheckersState = {
        board,
        turn: 1,
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const moves = getLegalMoves(state);
      expect(moves).toHaveLength(2);
      expect(moves.every((m) => m.from === 22 && m.path[1] === 13)).toBe(true);

      const destinations = moves.map((m) => m.to).sort((a, b) => a - b);
      expect(destinations).toEqual([4, 6]);
    });
  });

  describe('King Crowning Mechanics (ADR-0007 / English Rules)', () => {
    it('crowns a Black man when stepping onto row 0 (indices 0..3)', () => {
      const board = createCustomBoard({
        5: BLACK_MAN, // row 1, col 2 -> can step to sq 0 (row 0, col 1) or sq 1 (row 0, col 3)
      });

      const state: CheckersState = {
        board,
        turn: 1,
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const moves = getLegalMoves(state);
      expect(moves).toHaveLength(2);
      expect(moves.every((m) => m.crowned)).toBe(true);

      const nextState = applyMove(state, moves[0]);
      expect(nextState.board[moves[0].to]).toBe(BLACK_KING);
    });

    it('crowns a White man when stepping onto row 7 (indices 28..31)', () => {
      const board = createCustomBoard({
        26: WHITE_MAN, // row 6, col 5 -> can step to sq 30 (row 7, col 4) or sq 31 (row 7, col 6)
      });

      const state: CheckersState = {
        board,
        turn: 2,
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const moves = getLegalMoves(state);
      expect(moves).toHaveLength(2);
      expect(moves.every((m) => m.crowned)).toBe(true);

      const nextState = applyMove(state, moves[0]);
      expect(nextState.board[moves[0].to]).toBe(WHITE_KING);
    });

    it('terminates turn immediately when a man reaches king row during a multi-jump (ADR-0007)', () => {
      // Black man at 10 (row 2, col 5).
      // Jump over White man at 6 (row 1, col 4) into square 1 (row 0, col 3) which is king row!
      // Even if another opponent piece is at square 5 and square 10 is empty, the man MUST crown and stop.
      const board = createCustomBoard({
        10: BLACK_MAN,
        6: WHITE_MAN,
        5: WHITE_MAN,
      });

      const state: CheckersState = {
        board,
        turn: 1,
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const moves = getLegalMoves(state);
      expect(moves).toHaveLength(1);

      const crownedJump = moves[0];
      expect(crownedJump.to).toBe(1);
      expect(crownedJump.crowned).toBe(true);
      expect(crownedJump.captures).toEqual([6]);

      const nextState = applyMove(state, crownedJump);
      expect(nextState.board[1]).toBe(BLACK_KING);
      expect(nextState.turn).toBe(2);
    });

    it('allows Kings to move and jump backwards (all 4 diagonal directions)', () => {
      // Black King at square 14 (row 3, col 4) surrounded by empty squares
      const board = createCustomBoard({
        14: BLACK_KING,
      });

      const state: CheckersState = {
        board,
        turn: 1,
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const moves = getLegalMoves(state);
      // Square 14 has 4 diagonal neighbors: 9, 10 (forward/up) and 17, 18 (backward/down)
      expect(moves).toHaveLength(4);
      const dests = moves.map((m) => m.to).sort((a, b) => a - b);
      expect(dests).toEqual([9, 10, 17, 18]);

      // Backward jump for Black King: jumping White man at 18 to land on 23
      const jumpBoard = createCustomBoard({
        14: BLACK_KING,
        18: WHITE_MAN,
      });
      const jumpState: CheckersState = {
        board: jumpBoard,
        turn: 1,
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const jumpMoves = getLegalMoves(jumpState);
      expect(jumpMoves).toHaveLength(1);
      expect(jumpMoves[0].isJump).toBe(true);
      expect(jumpMoves[0].to).toBe(23);
      expect(jumpMoves[0].captures).toEqual([18]);
    });
  });

  describe('Terminal and Draw Conditions', () => {
    it('detects win by annihilation when opponent has 0 pieces', () => {
      const board = createCustomBoard({
        10: BLACK_KING,
        // White has 0 pieces
      });

      const state: CheckersState = {
        board,
        turn: 2, // White's turn, but White has 0 pieces
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const result = checkGameOver(state);
      expect(result.isOver).toBe(true);
      expect(result.winner).toBe(1); // Black wins
      expect(result.reason).toBe('pieces');
    });

    it('detects win by trapped when active player has pieces but no legal moves', () => {
      // White piece at square 0 (row 0, col 1).
      // Step neighbors are square 4 and square 5.
      // Both are occupied by Black pieces that cannot be jumped (e.g. edge or backed up).
      // White piece at 0:
      // Jump over 4 would need row 2, col -1 (off board).
      // Jump over 5 would need square 9, occupied by Black piece.
      const board = createCustomBoard({
        0: WHITE_MAN,
        4: BLACK_MAN,
        5: BLACK_MAN,
        9: BLACK_MAN,
      });

      const state: CheckersState = {
        board,
        turn: 2, // White's turn
        pliesWithoutCaptureOrManAdvance: 0,
        history: [],
        winner: null,
      };

      const result = checkGameOver(state);
      expect(result.isOver).toBe(true);
      expect(result.winner).toBe(1); // Black wins because White is trapped
      expect(result.reason).toBe('trapped');
    });

    it('detects draw by 40-move rule (80 plies without capture or man advance)', () => {
      const board = createCustomBoard({
        1: BLACK_KING,
        30: WHITE_KING,
      });

      const state: CheckersState = {
        board,
        turn: 1,
        pliesWithoutCaptureOrManAdvance: 80,
        history: [],
        winner: null,
      };

      const result = checkGameOver(state);
      expect(result.isOver).toBe(true);
      expect(result.winner).toBeNull();
      expect(result.reason).toBe('forty_move_rule');
    });

    it('detects draw by threefold repetition', () => {
      const board = createCustomBoard({
        1: BLACK_KING,
        30: WHITE_KING,
      });

      const state: CheckersState = {
        board,
        turn: 1,
        pliesWithoutCaptureOrManAdvance: 10,
        history: [],
        winner: null,
      };

      const serialized = `${board.join(',')}|1`;
      state.history = [serialized, 'other_pos|2', serialized, 'another_pos|2', serialized];

      const result = checkGameOver(state);
      expect(result.isOver).toBe(true);
      expect(result.winner).toBeNull();
      expect(result.reason).toBe('repetition');
    });
  });
});
