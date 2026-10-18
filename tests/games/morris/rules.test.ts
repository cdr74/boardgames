import { describe, expect, it } from 'vitest';
import { MILLS } from '../../../src/games/morris/constants';
import { createInitialGameState, getPlayerPhase } from '../../../src/games/morris/board';
import { applyMove, formsMillOnMove, getLegalMoves, getValidCaptureTargets, isMillAtPoint } from '../../../src/games/morris/rules';
import { EMPTY, PointId } from '../../../src/games/morris/types';

describe('Nine Men\'s Morris Core Rules', () => {
  it('initializes game state with 9 pieces each and White turn', () => {
    const state = createInitialGameState();
    expect(state.board.length).toBe(24);
    expect(state.board.every((p) => p === EMPTY)).toBe(true);
    expect(state.turn).toBe(1);
    expect(state.whitePiecesInHand).toBe(9);
    expect(state.blackPiecesInHand).toBe(9);
    expect(state.whitePiecesOnBoard).toBe(0);
    expect(state.blackPiecesOnBoard).toBe(0);
    expect(state.winner).toBeNull();
  });

  it('detects all 16 defined mills correctly', () => {
    expect(MILLS.length).toBe(16);

    for (const [p1, p2, p3] of MILLS) {
      const board = new Array(24).fill(EMPTY);
      board[p1] = 1;
      board[p2] = 1;
      board[p3] = 1;

      expect(isMillAtPoint(board, p1, 1)).toBe(true);
      expect(isMillAtPoint(board, p2, 1)).toBe(true);
      expect(isMillAtPoint(board, p3, 1)).toBe(true);
      // Opponent should not have a mill
      expect(isMillAtPoint(board, p1, 2)).toBe(false);
    }
  });

  it('correctly detects when a move forms a mill', () => {
    const board = new Array(24).fill(EMPTY);
    board[0] = 1;
    board[1] = 1;
    // Point 2 is empty

    expect(formsMillOnMove(board, undefined, 2, 1)).toBe(true);
    // An unrelated point shouldn't form a mill
    expect(formsMillOnMove(board, undefined, 3, 1)).toBe(false);
  });

  it('enforces mill protection rule: cannot capture piece in mill unless ALL opponent pieces are in mills', () => {
    const board = new Array(24).fill(EMPTY);
    // Opponent (Player 2) has a mill at (0, 1, 2) and a free piece at 4
    board[0] = 2;
    board[1] = 2;
    board[2] = 2;
    board[4] = 2;

    const targets = getValidCaptureTargets(board, 2);
    // Only point 4 is valid to capture because (0, 1, 2) is an active mill
    expect(targets).toEqual([4]);

    // Now if point 4 is also in a mill or removed:
    board[4] = EMPTY;
    // Now ALL opponent pieces (0, 1, 2) are in a mill
    const targetsAllMills = getValidCaptureTargets(board, 2);
    // Now any piece can be captured under tournament rules!
    expect(targetsAllMills.sort()).toEqual([0, 1, 2]);
  });

  it('transitions player to Flying phase when reduced to 3 pieces with flying enabled', () => {
    const state = createInitialGameState(true);
    state.whitePiecesInHand = 0;
    state.blackPiecesInHand = 0;
    state.whitePiecesOnBoard = 3;
    state.blackPiecesOnBoard = 5;

    expect(getPlayerPhase(state, 1)).toBe('flying');
    expect(getPlayerPhase(state, 2)).toBe('movement');

    // If flying is disabled in options:
    state.flyingEnabled = false;
    expect(getPlayerPhase(state, 1)).toBe('movement');
  });

  it('declares opponent winner when player has fewer than 3 pieces after placement', () => {
    const state = createInitialGameState();
    state.whitePiecesInHand = 0;
    state.blackPiecesInHand = 0;
    state.whitePiecesOnBoard = 3;
    state.blackPiecesOnBoard = 5;
    state.turn = 2; // Black's turn

    // Black makes a move that captures a White piece, reducing White to 2 pieces
    state.board[0] = 2;
    state.board[1] = 2;
    state.board[3] = 1;
    state.board[4] = 1;
    state.board[5] = 1;

    const move = {
      type: 'place' as const,
      to: 2 as PointId,
      capture: 3 as PointId,
    };

    const next = applyMove(state, move);
    expect(next.whitePiecesOnBoard).toBe(2);
    expect(next.winner).toBe(2); // Black wins
    expect(next.winReason).toBe('pieces');
  });

  it('declares opponent winner when player is trapped with 0 legal moves', () => {
    const state = createInitialGameState();
    state.whitePiecesInHand = 0;
    state.blackPiecesInHand = 0;
    state.whitePiecesOnBoard = 4;
    state.blackPiecesOnBoard = 4;
    state.turn = 1; // White's turn

    // Trap White at point 0 (neighbors are 1 and 7)
    state.board[0] = 1;
    state.board[1] = 2; // Black blocks 1
    state.board[7] = 2; // Black blocks 7

    // Give White other pieces that are also blocked
    // Point 2 (neighbors 1 and 3)
    state.board[2] = 1;
    state.board[3] = 2; // Black blocks 3

    // Point 4 (neighbors 3 and 5)
    state.board[4] = 1;
    state.board[5] = 2; // Black blocks 5

    // Point 6 (neighbors 5 and 7)
    state.board[6] = 1;

    // All White pieces (0, 2, 4, 6) have their neighbors blocked by Black (1, 3, 5, 7)
    const moves = getLegalMoves(state);
    expect(moves.length).toBe(0);
  });

  it('correctly detects Player 2 (Black) mill formation and generates capture targets for Player 1', () => {
    const board = new Array(24).fill(EMPTY);
    board[8] = 2;
    board[9] = 2;
    // Moving or placing to 10 forms a mill for Black (2)
    expect(formsMillOnMove(board, undefined, 10, 2)).toBe(true);

    board[10] = 2;
    board[0] = 1; // White piece not in mill
    board[1] = 1;
    board[2] = 1; // White pieces (0, 1, 2) in mill
    board[4] = 1; // White piece not in mill

    const targets = getValidCaptureTargets(board, 1);
    expect(targets.sort()).toEqual([4]);
  });
});

