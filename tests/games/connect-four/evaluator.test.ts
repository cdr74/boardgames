import { describe, expect, it } from 'vitest';
import { createInitialConnectFourState } from '../../../src/games/connect-four/board';
import {
  ALL_WINDOWS,
  evaluateConnectFourState,
  isConnectFourTacticalMove,
} from '../../../src/games/connect-four/evaluator';
import { applyMove } from '../../../src/games/connect-four/rules';

describe('Connect Four - Heuristic Evaluator & Tactical Analysis', () => {
  it('precomputes exactly 69 four-cell windows across the 7x6 board', () => {
    // 24 horizontal + 21 vertical + 12 diagonal up + 12 diagonal down = 69
    expect(ALL_WINDOWS.length).toBe(69);
  });

  it('evaluates initial empty board symmetrically to 0', () => {
    const state = createInitialConnectFourState();
    expect(evaluateConnectFourState(state, 1)).toBe(0);
    expect(evaluateConnectFourState(state, 2)).toBe(0);
  });

  it('rates center column placement higher than edge placement', () => {
    const centerState = createInitialConnectFourState();
    centerState.board[3][0] = 1;
    centerState.heights[3] = 1;
    centerState.movesCount = 1;

    const edgeState = createInitialConnectFourState();
    edgeState.board[0][0] = 1;
    edgeState.heights[0] = 1;
    edgeState.movesCount = 1;

    const centerScore = evaluateConnectFourState(centerState, 1);
    const edgeScore = evaluateConnectFourState(edgeState, 1);

    expect(centerScore).toBeGreaterThan(edgeScore);
  });

  it('awards significant bonus for open 3-in-a-row threats', () => {
    const state = createInitialConnectFourState();
    // 3 discs for P1 on bottom row: col 1, 2, 3
    state.board[1][0] = 1;
    state.board[2][0] = 1;
    state.board[3][0] = 1;
    state.heights[1] = 1;
    state.heights[2] = 1;
    state.heights[3] = 1;
    state.movesCount = 3;

    const score = evaluateConnectFourState(state, 1);
    // Should have multiple windows with 3 pieces (e.g. [0,1,2,3] and [1,2,3,4])
    expect(score).toBeGreaterThan(200);
  });

  it('evaluates blocked windows with both player pieces to zero', () => {
    const state = createInitialConnectFourState();
    // Col 0 has P1, Col 1 has P2 on row 0
    state.board[0][0] = 1;
    state.board[1][0] = 2;
    state.heights[0] = 1;
    state.heights[1] = 1;
    state.movesCount = 2;

    // Both P1 and P2 have 1 piece, equal positional score (col 0 weight 0, col 1 weight 1)
    const scoreP1 = evaluateConnectFourState(state, 1);
    const scoreP2 = evaluateConnectFourState(state, 2);
    expect(scoreP1).toBe(-scoreP2);
  });

  it('evaluates terminal win and loss appropriately', () => {
    let wonState = createInitialConnectFourState();
    wonState.winner = 1;
    wonState.movesCount = 7;

    expect(evaluateConnectFourState(wonState, 1)).toBe(100000 - 7);
    expect(evaluateConnectFourState(wonState, 2)).toBe(-(100000 - 7));

    let drawState = createInitialConnectFourState();
    drawState.winner = 'draw';
    expect(evaluateConnectFourState(drawState, 1)).toBe(0);
  });

  describe('isConnectFourTacticalMove', () => {
    it('identifies winning move that completes 4-in-a-row as tactical', () => {
      let state = createInitialConnectFourState();
      // P1 has 3 in row 0: (1,0), (2,0), (3,0)
      state = applyMove(state, { column: 1, row: 0 }); // P1
      state = applyMove(state, { column: 1, row: 1 }); // P2
      state = applyMove(state, { column: 2, row: 0 }); // P1
      state = applyMove(state, { column: 2, row: 1 }); // P2
      state = applyMove(state, { column: 3, row: 0 }); // P1
      state = applyMove(state, { column: 3, row: 1 }); // P2

      // Now P1's turn. Playing { column: 4, row: 0 } completes 4-in-a-row!
      expect(state.turn).toBe(1);
      const isTactical = isConnectFourTacticalMove({ column: 4, row: 0 }, state);
      expect(isTactical).toBe(true);

      // Playing column 6 is not tactical
      expect(isConnectFourTacticalMove({ column: 6, row: 0 }, state)).toBe(false);
    });

    it('identifies defensive blocking move that stops opponent win as tactical', () => {
      let state = createInitialConnectFourState();
      // P1 has 3 in row 0: (1,0), (2,0), (3,0)
      state = applyMove(state, { column: 1, row: 0 }); // P1
      state = applyMove(state, { column: 6, row: 0 }); // P2
      state = applyMove(state, { column: 2, row: 0 }); // P1
      state = applyMove(state, { column: 6, row: 1 }); // P2
      state = applyMove(state, { column: 3, row: 0 }); // P1
      // Now it's P2's turn! P1 threatens to win at col 0 row 0, or col 4 row 0.
      expect(state.turn).toBe(2);

      // P2 playing at col 4 row 0 blocks P1's win -> tactical!
      expect(isConnectFourTacticalMove({ column: 4, row: 0 }, state)).toBe(true);
      // P2 playing at col 0 row 0 blocks P1's win -> tactical!
      expect(isConnectFourTacticalMove({ column: 0, row: 0 }, state)).toBe(true);
      // P2 playing at col 6 row 2 does not block -> not tactical
      expect(isConnectFourTacticalMove({ column: 6, row: 2 }, state)).toBe(false);
    });
  });
});
