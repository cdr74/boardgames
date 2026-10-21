import { describe, expect, it } from 'vitest';
import { createInitialConnectFourState } from '../../../src/games/connect-four/board';
import { applyMove, getLegalMoves, isValidMove } from '../../../src/games/connect-four/rules';

describe('Connect Four - Game Rules and Move Generation', () => {
  it('generates all 7 legal moves in center-out exploration order from initial state', () => {
    const state = createInitialConnectFourState();
    const legalMoves = getLegalMoves(state);

    expect(legalMoves).toHaveLength(7);
    // Center-out order: [3, 2, 4, 1, 5, 0, 6]
    expect(legalMoves.map((m) => m.column)).toEqual([3, 2, 4, 1, 5, 0, 6]);
    // All initial drops land on row 0
    expect(legalMoves.every((m) => m.row === 0)).toBe(true);
  });

  it('stacks pieces under gravity when dropped into the same column', () => {
    let state = createInitialConnectFourState();

    // Player 1 drops in col 3 -> lands at row 0
    state = applyMove(state, { column: 3, row: 0 });
    expect(state.board[3][0]).toBe(1);
    expect(state.heights[3]).toBe(1);
    expect(state.turn).toBe(2);
    expect(state.movesCount).toBe(1);

    // Player 2 drops in col 3 -> lands at row 1
    state = applyMove(state, { column: 3, row: 1 });
    expect(state.board[3][1]).toBe(2);
    expect(state.heights[3]).toBe(2);
    expect(state.turn).toBe(1);
    expect(state.movesCount).toBe(2);
  });

  it('excludes full columns from legal moves list', () => {
    let state = createInitialConnectFourState();

    // Fill column 0 completely (6 rows)
    for (let r = 0; r < 6; r++) {
      state = applyMove(state, { column: 0, row: r });
    }

    expect(state.heights[0]).toBe(6);
    expect(isValidMove(state, 0)).toBe(false);

    const moves = getLegalMoves(state);
    expect(moves).toHaveLength(6);
    expect(moves.some((m) => m.column === 0)).toBe(false);
  });

  it('throws an error when attempting to play in a full column or invalid row', () => {
    let state = createInitialConnectFourState();
    for (let r = 0; r < 6; r++) {
      state = applyMove(state, { column: 0, row: r });
    }

    expect(() => applyMove(state, { column: 0, row: 6 })).toThrow(/full/i);
    expect(() => applyMove(state, { column: 1, row: 2 })).toThrow(/gravity/i);
    expect(() => applyMove(state, { column: 9, row: 0 })).toThrow(/out of bounds/i);
  });

  it('detects horizontal 4-in-a-row victory for Player 1', () => {
    let state = createInitialConnectFourState();
    // P1: (0,0), (1,0), (2,0), (3,0)
    // P2 plays elsewhere on row 0: (0,1), (1,1), (2,1)
    state = applyMove(state, { column: 0, row: 0 }); // P1 (0,0)
    state = applyMove(state, { column: 0, row: 1 }); // P2 (0,1)
    state = applyMove(state, { column: 1, row: 0 }); // P1 (1,0)
    state = applyMove(state, { column: 1, row: 1 }); // P2 (1,1)
    state = applyMove(state, { column: 2, row: 0 }); // P1 (2,0)
    state = applyMove(state, { column: 2, row: 1 }); // P2 (2,1)
    state = applyMove(state, { column: 3, row: 0 }); // P1 (3,0) -> WIN!

    expect(state.winner).toBe(1);
    expect(state.winReason).toBe('connect4');
    expect(state.winningCells).toEqual([
      { column: 0, row: 0 },
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 3, row: 0 },
    ]);
    expect(getLegalMoves(state)).toEqual([]);
  });

  it('detects vertical 4-in-a-row victory for Player 2', () => {
    let state = createInitialConnectFourState();
    state = applyMove(state, { column: 0, row: 0 }); // P1
    state = applyMove(state, { column: 3, row: 0 }); // P2
    state = applyMove(state, { column: 1, row: 0 }); // P1
    state = applyMove(state, { column: 3, row: 1 }); // P2
    state = applyMove(state, { column: 2, row: 0 }); // P1
    state = applyMove(state, { column: 3, row: 2 }); // P2
    state = applyMove(state, { column: 4, row: 0 }); // P1
    state = applyMove(state, { column: 3, row: 3 }); // P2 -> WIN!

    expect(state.winner).toBe(2);
    expect(state.winReason).toBe('connect4');
    expect(state.winningCells).toEqual([
      { column: 3, row: 0 },
      { column: 3, row: 1 },
      { column: 3, row: 2 },
      { column: 3, row: 3 },
    ]);
  });

  it('correctly builds and identifies diagonal up-right victory', () => {
    let state = createInitialConnectFourState();
    state = applyMove(state, { column: 0, row: 0 }); // P1 (0,0)
    state = applyMove(state, { column: 1, row: 0 }); // P2 (1,0)
    state = applyMove(state, { column: 1, row: 1 }); // P1 (1,1)
    state = applyMove(state, { column: 2, row: 0 }); // P2 (2,0)
    state = applyMove(state, { column: 3, row: 0 }); // P1 (3,0)
    state = applyMove(state, { column: 2, row: 1 }); // P2 (2,1)
    state = applyMove(state, { column: 2, row: 2 }); // P1 (2,2)
    state = applyMove(state, { column: 3, row: 1 }); // P2 (3,1)
    state = applyMove(state, { column: 5, row: 0 }); // P1 (5,0)
    state = applyMove(state, { column: 3, row: 2 }); // P2 (3,2)
    state = applyMove(state, { column: 3, row: 3 }); // P1 (3,3) -> WIN!

    expect(state.winner).toBe(1);
    expect(state.winReason).toBe('connect4');
    expect(state.winningCells).toEqual([
      { column: 0, row: 0 },
      { column: 1, row: 1 },
      { column: 2, row: 2 },
      { column: 3, row: 3 },
    ]);
  });

  it('detects draw when 42 moves are played with no alignment', () => {
    // Generate a known draw board pattern:
    // Columns filled such that no 4-in-a-row is formed
    // For test simplicity, mock a state with 41 moves, then play 42nd move
    let state = createInitialConnectFourState();
    // Fill state movesCount to 41, with heights: [6, 6, 6, 6, 6, 6, 5]
    state.movesCount = 41;
    state.heights = [6, 6, 6, 6, 6, 6, 5];
    const nextState = applyMove(state, { column: 6, row: 5 });
    expect(nextState.movesCount).toBe(42);
    expect(nextState.winner).toBe('draw');
    expect(nextState.winReason).toBe('board_full');
  });
});
