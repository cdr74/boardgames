// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { MILLS } from '../../../src/games/morris/constants';
import { applyMove, formsMillOnMove, getValidCaptureTargets, isMillAtPoint, isPointInAnyMill } from '../../../src/games/morris/rules';
import { cloneGameState, createInitialGameState } from '../../../src/games/morris/board';
import { countFormedMills } from '../../../src/games/morris/evaluator';
import { BoardView } from '../../../src/games/morris/ui/board-view';
import { EMPTY, PointId, PointState } from '../../../src/games/morris/types';

describe('Corner Triplets Non-Mill Rule Verification', () => {
  // All 12 corners and their 2 adjacent points forming an L-shape around the corner
  const cornerTriplets: { corner: PointId; n1: PointId; n2: PointId; name: string }[] = [
    // Outer square
    { corner: 0, n1: 7, n2: 1, name: 'Outer Top-Left (7-0-1)' },
    { corner: 2, n1: 1, n2: 3, name: 'Outer Top-Right (1-2-3)' },
    { corner: 4, n1: 3, n2: 5, name: 'Outer Bottom-Right (3-4-5)' },
    { corner: 6, n1: 5, n2: 7, name: 'Outer Bottom-Left (5-6-7)' },

    // Middle square
    { corner: 8, n1: 15, n2: 9, name: 'Middle Top-Left (15-8-9)' },
    { corner: 10, n1: 9, n2: 11, name: 'Middle Top-Right (9-10-11)' },
    { corner: 12, n1: 11, n2: 13, name: 'Middle Bottom-Right (11-12-13)' },
    { corner: 14, n1: 13, n2: 15, name: 'Middle Bottom-Left (13-14-15)' },

    // Inner square
    { corner: 16, n1: 23, n2: 17, name: 'Inner Top-Left (23-16-17)' },
    { corner: 18, n1: 17, n2: 19, name: 'Inner Top-Right (17-18-19)' },
    { corner: 20, n1: 19, n2: 21, name: 'Inner Bottom-Right (19-20-21)' },
    { corner: 22, n1: 21, n2: 23, name: 'Inner Bottom-Left (21-22-23)' },

    // Diagonal corner triplets across the 3 squares (not connected in 9 Men's Morris)
    { corner: 0, n1: 8, n2: 16, name: 'Diagonal Top-Left (0-8-16)' },
    { corner: 2, n1: 10, n2: 18, name: 'Diagonal Top-Right (2-10-18)' },
    { corner: 4, n1: 12, n2: 20, name: 'Diagonal Bottom-Right (4-12-20)' },
    { corner: 6, n1: 14, n2: 22, name: 'Diagonal Bottom-Left (6-14-22)' },
  ];

  for (const { corner, n1, n2, name } of cornerTriplets) {
    it(`never detects mill for 3 pieces around ${name}`, () => {
      const board: PointState[] = new Array(24).fill(EMPTY);
      board[corner] = 1;
      board[n1] = 1;
      board[n2] = 1;

      expect(isMillAtPoint(board, corner, 1)).toBe(false);
      expect(isMillAtPoint(board, n1, 1)).toBe(false);
      expect(isMillAtPoint(board, n2, 1)).toBe(false);

      expect(isPointInAnyMill(board, corner)).toBe(false);
      expect(isPointInAnyMill(board, n1)).toBe(false);
      expect(isPointInAnyMill(board, n2)).toBe(false);

      expect(countFormedMills(board, 1)).toBe(0);
    });

    it(`never triggers formsMillOnMove when completing ${name} in any placement order`, () => {
      // Order 1: n1 and corner present, placing n2
      const b1: PointState[] = new Array(24).fill(EMPTY);
      b1[corner] = 1;
      b1[n1] = 1;
      expect(formsMillOnMove(b1, undefined, n2, 1)).toBe(false);

      // Order 2: n1 and n2 present, placing corner
      const b2: PointState[] = new Array(24).fill(EMPTY);
      b2[n1] = 1;
      b2[n2] = 1;
      expect(formsMillOnMove(b2, undefined, corner, 1)).toBe(false);

      // Order 3: corner and n2 present, placing n1
      const b3: PointState[] = new Array(24).fill(EMPTY);
      b3[corner] = 1;
      b3[n2] = 1;
      expect(formsMillOnMove(b3, undefined, n1, 1)).toBe(false);
    });
  }

  it('guarantees that placing 3 pieces around corner (0, 1, 7) in live match never triggers mill or pending capture', () => {
    let state = createInitialGameState();

    // Turn 1: White places at 0
    expect(formsMillOnMove(state.board, undefined, 0, 1)).toBe(false);
    state = applyMove(state, { type: 'place', to: 0 });

    // Turn 1: Black places at 4
    state = applyMove(state, { type: 'place', to: 4 });

    // Turn 2: White places at 1
    expect(formsMillOnMove(state.board, undefined, 1, 1)).toBe(false);
    state = applyMove(state, { type: 'place', to: 1 });

    // Turn 2: Black places at 12
    state = applyMove(state, { type: 'place', to: 12 });

    // Turn 3: White places at 7 (forming L-shape 7-0-1 around corner 0)
    expect(formsMillOnMove(state.board, undefined, 7, 1)).toBe(false);
    state = applyMove(state, { type: 'place', to: 7 });

    // Confirm state has no mill and no pending capture
    expect(isMillAtPoint(state.board, 0, 1)).toBe(false);
    expect(isMillAtPoint(state.board, 1, 1)).toBe(false);
    expect(isMillAtPoint(state.board, 7, 1)).toBe(false);
    expect(state.pendingCapture).toBe(false);
  });

  it('exhaustively verifies all 2,024 3-piece board combinations: exactly the 16 defined mills match', () => {
    const validMillSet = new Set(
      MILLS.map(([a, b, c]) => [a, b, c].sort((x, y) => x - y).join(','))
    );
    expect(validMillSet.size).toBe(16);

    let combinationsTested = 0;
    let millsDetected = 0;

    for (let i = 0; i < 24; i++) {
      for (let j = i + 1; j < 24; j++) {
        for (let k = j + 1; k < 24; k++) {
          combinationsTested++;
          const board: PointState[] = new Array(24).fill(EMPTY);
          board[i] = 1;
          board[j] = 1;
          board[k] = 1;

          const key = `${i},${j},${k}`;
          const isExpectedMill = validMillSet.has(key);
          const millCount = countFormedMills(board, 1);

          if (isExpectedMill) {
            expect(millCount).toBe(1);
            expect(isMillAtPoint(board, i as PointId, 1)).toBe(true);
            expect(isMillAtPoint(board, j as PointId, 1)).toBe(true);
            expect(isMillAtPoint(board, k as PointId, 1)).toBe(true);
            millsDetected++;
          } else {
            expect(millCount).toBe(0);
            expect(isMillAtPoint(board, i as PointId, 1)).toBe(false);
            expect(isMillAtPoint(board, j as PointId, 1)).toBe(false);
            expect(isMillAtPoint(board, k as PointId, 1)).toBe(false);
          }
        }
      }
    }

    expect(combinationsTested).toBe(2024);
    expect(millsDetected).toBe(16);
  });

  it('renders interim board state showing newly placed piece and capture targets during mill formation', () => {
    const container = document.createElement('div');
    const view = new BoardView(container, { onPointClick: () => {} });

    let state = createInitialGameState();
    // Setup state where White has 0, 1 and Black has 4
    state.board[0] = 1;
    state.board[1] = 1;
    state.board[4] = 2;
    state.whitePiecesInHand = 7;
    state.whitePiecesOnBoard = 2;
    state.blackPiecesInHand = 8;
    state.blackPiecesOnBoard = 1;

    // White plays at point 2, which completes straight mill (0, 1, 2)
    const isMill = formsMillOnMove(state.board, undefined, 2, 1);
    expect(isMill).toBe(true);

    const nextBoard = [...state.board];
    nextBoard[2] = 1;
    const validCaptures = getValidCaptureTargets(nextBoard, 2);
    expect(validCaptures).toEqual([4]);

    // Build and render interim state before capture click
    const interimState = cloneGameState(state);
    interimState.board[2] = 1;
    interimState.whitePiecesInHand--;
    interimState.whitePiecesOnBoard++;
    interimState.pendingCapture = true;

    view.setRecentMove(undefined, 2);
    view.setCaptureTargets(validCaptures);
    view.render(interimState);

    // Verify interim visual representation:
    // 1. Point 2 has a visible White piece
    const point2 = container.querySelector('g.board-point[data-point-id="2"]');
    expect(point2?.querySelector('.piece-white')).not.toBeNull();

    // 2. Point 4 has a pulsating red capture ring
    const point4 = container.querySelector('g.board-point[data-point-id="4"]');
    expect(point4?.querySelector('.capture-ring')).not.toBeNull();

    // 3. Completing straight line points 0, 1, 2 all have pieces visible
    const point0 = container.querySelector('g.board-point[data-point-id="0"] .piece-white');
    const point1 = container.querySelector('g.board-point[data-point-id="1"] .piece-white');
    expect(point0).not.toBeNull();
    expect(point1).not.toBeNull();
  });
});
