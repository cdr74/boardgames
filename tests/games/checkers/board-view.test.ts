// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { CheckersBoardView } from '../../../src/games/checkers/ui/board-view';
import {
  BLACK_KING,
  createInitialCheckersState,
  EMPTY,
  PieceValue,
  TOTAL_SQUARES,
  WHITE_MAN,
} from '../../../src/games/checkers';

describe('CheckersBoardView SVG Rendering & Interaction (TASK-206)', () => {
  let container: HTMLDivElement;
  let clickedSquares: number[];
  let view: CheckersBoardView;

  beforeEach(() => {
    container = document.createElement('div');
    clickedSquares = [];
    view = new CheckersBoardView(container, {
      onSquareClick: (sq) => clickedSquares.push(sq),
    });
  });

  it('initializes SVG with 640x640 viewBox and semantic accessibility attributes', () => {
    const svg = container.querySelector('svg.game-board-svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 640 640');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('English Checkers Game Board');
  });

  it('renders 64 board squares (32 light and 32 dark squares)', () => {
    const state = createInitialCheckersState();
    view.render(state);

    const lightSquares = container.querySelectorAll('rect.light-square');
    const darkSquares = container.querySelectorAll('rect.dark-square');

    expect(lightSquares.length).toBe(32);
    expect(darkSquares.length).toBe(32);
  });

  it('renders all 32 dark interactive groups with touch targets and correct indexing', () => {
    const state = createInitialCheckersState();
    view.render(state);

    const interactiveGroups = container.querySelectorAll('g.board-square-interactive');
    expect(interactiveGroups.length).toBe(32);

    for (let i = 0; i < 32; i++) {
      const g = container.querySelector(`g.board-square-interactive[data-square-index="${i}"]`);
      expect(g).not.toBeNull();
      expect(g?.getAttribute('role')).toBe('button');
      expect(g?.getAttribute('tabindex')).toBe('0');
    }
  });

  it('renders initial 24 pieces with 12 Black and 12 White discs', () => {
    const state = createInitialCheckersState();
    view.render(state);

    const blackPieces = container.querySelectorAll('g.checkers-piece.piece-black');
    const whitePieces = container.querySelectorAll('g.checkers-piece.piece-white');

    expect(blackPieces.length).toBe(12);
    expect(whitePieces.length).toBe(12);
  });

  it('renders golden crown polygon and gems for crowned Kings', () => {
    const board: PieceValue[] = new Array(TOTAL_SQUARES).fill(EMPTY);
    board[10] = BLACK_KING;
    board[20] = WHITE_MAN;

    const state = {
      board,
      turn: 1 as const,
      pliesWithoutCaptureOrManAdvance: 0,
      history: [],
      winner: null,
    };

    view.render(state);

    const crown = container.querySelector('polygon.king-crown');
    expect(crown).not.toBeNull();
    expect(crown?.getAttribute('fill')).toBe('#fbbf24');
  });

  it('renders selection halo and legal destination highlights', () => {
    const state = createInitialCheckersState();
    view.setSelectedSquare(21);
    view.setHighlightedDestinations([16, 17]);
    view.render(state);

    const halo = container.querySelector('circle.selection-halo');
    expect(halo).not.toBeNull();

    const destHighlights = container.querySelectorAll('circle.dest-highlight');
    expect(destHighlights.length).toBe(2);
  });

  it('renders multi-jump trajectory polyline when path is provided', () => {
    const state = createInitialCheckersState();
    view.setRecentMove(22, 6, [22, 13, 6]);
    view.render(state);

    const polyline = container.querySelector('polyline.move-trajectory-line');
    expect(polyline).not.toBeNull();
    expect(polyline?.getAttribute('points')).toBeTruthy();
  });

  it('fires onSquareClick callback when interactive square is clicked', () => {
    const state = createInitialCheckersState();
    view.render(state);

    const sq10Group = container.querySelector<SVGGElement>('g[data-square-index="10"]');
    expect(sq10Group).not.toBeNull();

    sq10Group?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clickedSquares).toEqual([10]);
  });
});
