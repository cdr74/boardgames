import { describe, expect, it } from 'vitest';
import { createInitialReversiState } from '../../../src/games/reversi/board';
import {
  applyMove,
  getFlipsForMove,
  getLegalMoves,
  getOpponent,
  isValidMove,
} from '../../../src/games/reversi/rules';
import { EMPTY } from '../../../src/games/reversi/types';

describe('Reversi - Rules & Flanking Mechanics (TASK-402)', () => {
  it('correctly toggles opponent', () => {
    expect(getOpponent(1)).toBe(2);
    expect(getOpponent(2)).toBe(1);
  });

  it('generates the classic 4 opening moves for Black from initial position', () => {
    const state = createInitialReversiState();
    const legalMoves = getLegalMoves(state);

    // Initial legal moves for Black (1):
    // 19 (d3), 26 (c4), 37 (f5), 44 (e6)
    expect(legalMoves.length).toBe(4);
    const squares = legalMoves.map((m) => m.square).sort((a, b) => a - b);
    expect(squares).toEqual([19, 26, 37, 44]);
  });

  it('applies an opening move, flips the bracketed disc, and updates counts', () => {
    const state = createInitialReversiState();
    // Play square 19 (col 3 row 2, c4). White disc at 27 is bracketed between 19 and 35 (col 3 row 4).
    const nextState = applyMove(state, { square: 19 });

    expect(nextState.board[19]).toBe(1); // Black disc placed
    expect(nextState.board[27]).toBe(1); // White disc at 27 flipped to Black
    expect(nextState.blackCount).toBe(4); // 2 original + 1 placed + 1 flipped
    expect(nextState.whiteCount).toBe(1); // 2 original - 1 flipped
    expect(nextState.turn).toBe(2); // Turn passes to White
    expect(nextState.movesCount).toBe(1);
    expect(nextState.lastMove?.square).toBe(19);
    expect(nextState.lastMove?.flippedSquares).toEqual([27]);
  });

  it('flips discs across multiple directions simultaneously', () => {
    // Set up a board where placing a disc flips both horizontal and diagonal discs
    const board = new Array(64).fill(EMPTY);
    // Black at (1, 1 -> 9), White at (2, 2 -> 18), Target at (3, 3 -> 27)
    // Black at (3, 1 -> 11), White at (3, 2 -> 19), Target at (3, 3 -> 27)
    board[9] = 1; // Black
    board[18] = 2; // White
    board[11] = 1; // Black
    board[19] = 2; // White

    const flips = getFlipsForMove(board, 27, 1);
    expect(flips).toContain(18);
    expect(flips).toContain(19);
    expect(flips.length).toBe(2);
  });

  it('rejects moves that do not flip any opponent discs', () => {
    const state = createInitialReversiState();
    // Corner square 0 is empty but flips nothing
    expect(isValidMove(state, 0)).toBe(false);
    expect(() => applyMove(state, { square: 0 })).toThrow(/Illegal Reversi move/i);
  });

  it('handles automatic pass when active player has no moves but opponent can move', () => {
    // Construct a board where White has no legal moves, but Black can move
    const state = createInitialReversiState();
    const board = new Array(64).fill(EMPTY);

    // Place Black disc at corner 0, White at 1, Empty at 2, Black at 3
    // Black can play at 2. White has no moves anywhere.
    board[0] = 1;
    board[1] = 2;
    board[3] = 1;

    state.board = board;
    state.turn = 1;

    // Black plays at 2: flips 1 to Black. Board is now 0=1, 1=1, 2=1, 3=1 (all Black).
    // White is completely wiped out -> Black wins by wipeout!
    const nextState = applyMove(state, { square: 2 });
    expect(nextState.winner).toBe(1);
    expect(nextState.winReason).toBe('wipeout');
  });

  it('terminates game with correct winner when neither player has moves (double pass)', () => {
    const state = createInitialReversiState();
    const board = new Array(64).fill(EMPTY);

    // Two discs remaining on board, not adjacent
    board[0] = 1; // Black
    board[1] = 2; // White
    board[2] = 2; // White
    // Black plays at 3, flips 1 and 2
    board[63] = 2; // White lone disc at bottom right corner

    state.board = board;
    state.turn = 1;
    state.blackCount = 1;
    state.whiteCount = 3;

    // Black plays 3: flips 1 and 2 to Black.
    // Board has Black at 0, 1, 2, 3 and White at 63.
    // Neither player has any further legal moves!
    const nextState = applyMove(state, { square: 3 });
    expect(nextState.winner).toBe(1);
    expect(nextState.winReason).toBe('no_moves');
    expect(nextState.blackCount).toBe(4);
    expect(nextState.whiteCount).toBe(1);
  });
});
