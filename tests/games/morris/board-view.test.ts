// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { BoardView } from '../../../src/games/morris/ui/board-view';
import { createInitialGameState } from '../../../src/games/morris/board';

describe('BoardView SVG Rendering Resilience', () => {
  let container: HTMLDivElement;
  let clickedPoints: number[];
  let view: BoardView;

  beforeEach(() => {
    container = document.createElement('div');
    clickedPoints = [];
    view = new BoardView(container, {
      onPointClick: (pt) => clickedPoints.push(pt),
    });
  });

  it('initializes SVG with viewBox and semantic role attributes', () => {
    const svg = container.querySelector('svg.game-board-svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 600 600');
    expect(svg?.getAttribute('role')).toBe('img');
  });

  it('renders a board background plate with inline fallback fill and stroke', () => {
    const state = createInitialGameState();
    view.render(state);

    const bgPlate = container.querySelector('rect.board-background');
    expect(bgPlate).not.toBeNull();
    expect(bgPlate?.getAttribute('fill')).toBeTruthy();
    expect(bgPlate?.getAttribute('stroke')).toBeTruthy();
  });

  it('renders 3 concentric square lines with explicit inline stroke and stroke-width', () => {
    const state = createInitialGameState();
    view.render(state);

    const squares = container.querySelectorAll('rect.square-line');
    expect(squares.length).toBe(3);

    squares.forEach((sq) => {
      expect(sq.getAttribute('stroke')).toBeTruthy();
      expect(sq.getAttribute('stroke-width')).toBe('4');
      expect(sq.getAttribute('fill')).toBe('none');
    });
  });

  it('renders 4 midpoint connector lines with explicit inline stroke and stroke-width', () => {
    const state = createInitialGameState();
    view.render(state);

    const connectors = container.querySelectorAll('line.connector-line');
    expect(connectors.length).toBe(4);

    connectors.forEach((line) => {
      expect(line.getAttribute('stroke')).toBeTruthy();
      expect(line.getAttribute('stroke-width')).toBe('4');
      expect(line.getAttribute('stroke-linecap')).toBe('round');
    });
  });

  it('renders 24 intersection points with visible point-dot circles and inline stroke/fill', () => {
    const state = createInitialGameState();
    view.render(state);

    const points = container.querySelectorAll('g.board-point');
    expect(points.length).toBe(24);

    const dots = container.querySelectorAll('circle.point-dot');
    expect(dots.length).toBe(24);

    dots.forEach((dot) => {
      expect(dot.getAttribute('fill')).toBeTruthy();
      expect(dot.getAttribute('stroke')).toBeTruthy();
      expect(dot.getAttribute('r')).toBe('7');
    });
  });

  it('dispatches onPointClick callback when a point is clicked', () => {
    const state = createInitialGameState();
    view.render(state);

    const point5 = container.querySelector('g.board-point[data-point-id="5"]');
    expect(point5).not.toBeNull();

    point5?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clickedPoints).toEqual([5]);
  });

  it('renders legal move highlights, selection halo, and capture rings with stroke styling', () => {
    const state = createInitialGameState();
    state.board[0] = 1; // White piece on 0
    state.board[1] = 2; // Black piece on 1

    view.setSelectedPoint(0);
    view.setHighlightedPoints([9, 17]);
    view.setCaptureTargets([1]);
    view.render(state);

    const halo = container.querySelector('circle.selection-halo');
    expect(halo).not.toBeNull();
    expect(halo?.getAttribute('stroke')).toBeTruthy();

    const highlights = container.querySelectorAll('circle.dest-highlight');
    expect(highlights.length).toBe(2);
    highlights.forEach((h) => {
      expect(h.getAttribute('stroke')).toBeTruthy();
      expect(h.getAttribute('fill')).toBeTruthy();
    });

    const captureRing = container.querySelector('circle.capture-ring');
    expect(captureRing).not.toBeNull();
    expect(captureRing?.getAttribute('stroke')).toBeTruthy();
  });
});
