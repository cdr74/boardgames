// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialReversiState } from '../../../src/games/reversi/board';
import { applyMove } from '../../../src/games/reversi/rules';
import { ReversiBoardView } from '../../../src/games/reversi/ui/board-view';

describe('ReversiBoardView SVG Rendering & Interaction (TASK-405)', () => {
  let container: HTMLDivElement;
  let clickedSquares: number[];
  let view: ReversiBoardView;

  beforeEach(() => {
    container = document.createElement('div');
    clickedSquares = [];
    view = new ReversiBoardView(container, {
      onSquareClick: (sq) => clickedSquares.push(sq),
    });
  });

  it('initializes SVG with 640x640 viewBox and semantic accessibility attributes', () => {
    const svg = container.querySelector('svg.game-board-svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 640 640');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Reversi Game Board');
  });

  it('renders green felt base, 64 grid outlines, and 4 star dots', () => {
    const state = createInitialReversiState();
    view.render(state);

    const felt = container.querySelector('rect[fill="#15803d"]');
    expect(felt).not.toBeNull();

    const gridRects = container.querySelectorAll('.reversi-grid-lines rect');
    expect(gridRects.length).toBe(64);

    const starDots = container.querySelectorAll('.reversi-star-dots circle');
    expect(starDots.length).toBe(4);
  });

  it('renders initial 4 center discs with tactile styling', () => {
    const state = createInitialReversiState();
    view.render(state);

    const blackDiscs = container.querySelectorAll('.reversi-disc.disc-black');
    const whiteDiscs = container.querySelectorAll('.reversi-disc.disc-white');

    expect(blackDiscs.length).toBe(2);
    expect(whiteDiscs.length).toBe(2);
  });

  it('renders legal destination dots for active player', () => {
    const state = createInitialReversiState();
    view.render(state);

    // Initial position has 4 legal moves for Black: 19, 26, 37, 44
    const legalDots = container.querySelectorAll('.reversi-legal-dots circle');
    expect(legalDots.length).toBe(4);
  });

  it('triggers onSquareClick callback when clicking a legal square', () => {
    const state = createInitialReversiState();
    view.render(state);

    const sq19 = container.querySelector('g.reversi-square-interactive[data-square-index="19"]');
    expect(sq19).not.toBeNull();

    sq19?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clickedSquares).toEqual([19]);
  });

  it('renders recent move indicator ring around last placed square', () => {
    let state = createInitialReversiState();
    state = applyMove(state, { square: 19 });
    view.setRecentMove({ square: 19 });
    view.render(state);

    const recentRing = container.querySelector('circle.recent-move-to');
    expect(recentRing).not.toBeNull();
    // Square 19 -> col 3, row 2 -> cx 3 * 80 + 40 = 280, cy 2 * 80 + 40 = 200
    expect(recentRing?.getAttribute('cx')).toBe('280');
    expect(recentRing?.getAttribute('cy')).toBe('200');
  });
});
