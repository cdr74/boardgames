// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialConnectFourState } from '../../../src/games/connect-four/board';
import { applyMove } from '../../../src/games/connect-four/rules';
import { ConnectFourBoardView } from '../../../src/games/connect-four/ui/board-view';

describe('ConnectFourBoardView SVG Rendering & Interaction', () => {
  let container: HTMLDivElement;
  let clickedColumns: number[];
  let view: ConnectFourBoardView;

  beforeEach(() => {
    container = document.createElement('div');
    clickedColumns = [];
    view = new ConnectFourBoardView(container, {
      onColumnClick: (col) => clickedColumns.push(col),
    });
  });

  it('initializes SVG with 700x600 viewBox and semantic accessibility attributes', () => {
    const svg = container.querySelector('svg.game-board-svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 700 600');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Connect Four Game Board');
  });

  it('renders 42 empty slot backing circles and perforated blue rack plate', () => {
    const state = createInitialConnectFourState();
    view.render(state);

    const backings = container.querySelectorAll('.c4-slots-backing circle');
    expect(backings.length).toBe(42);

    const rackPlate = container.querySelector('rect.c4-rack-plate');
    expect(rackPlate).not.toBeNull();
    expect(rackPlate?.getAttribute('fill')).toBe('#1d4ed8');
  });

  it('renders all 7 interactive column hitboxes with touch targets and correct indexing', () => {
    const state = createInitialConnectFourState();
    view.render(state);

    const columnTargets = container.querySelectorAll('g.c4-column-target');
    expect(columnTargets.length).toBe(7);

    for (let c = 0; c < 7; c++) {
      const colG = container.querySelector(`g.c4-column-target[data-column="${c}"]`);
      expect(colG).not.toBeNull();
      expect(colG?.getAttribute('role')).toBe('button');
      expect(colG?.getAttribute('tabindex')).toBe('0');
      expect(colG?.getAttribute('aria-label')).toContain(`Column ${c + 1}`);
    }
  });

  it('renders played Red and Yellow discs at correct coordinates', () => {
    let state = createInitialConnectFourState();
    state = applyMove(state, { column: 3, row: 0 }); // Red disc
    state = applyMove(state, { column: 3, row: 1 }); // Yellow disc
    view.render(state);

    const redDiscs = container.querySelectorAll('.c4-disc.disc-red');
    const yellowDiscs = container.querySelectorAll('.c4-disc.disc-yellow');

    expect(redDiscs.length).toBe(1);
    expect(yellowDiscs.length).toBe(1);

    expect(redDiscs[0].getAttribute('data-col')).toBe('3');
    expect(redDiscs[0].getAttribute('data-row')).toBe('0');
    expect(yellowDiscs[0].getAttribute('data-col')).toBe('3');
    expect(yellowDiscs[0].getAttribute('data-row')).toBe('1');
  });

  it('invokes onColumnClick callback when interactive column is clicked', () => {
    const state = createInitialConnectFourState();
    view.render(state);

    const col2 = container.querySelector('g.c4-column-target[data-column="2"]');
    expect(col2).not.toBeNull();

    col2?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clickedColumns).toEqual([2]);
  });

  it('renders recent move indicator ring around target slot', () => {
    let state = createInitialConnectFourState();
    state = applyMove(state, { column: 4, row: 0 });
    view.setRecentMove({ column: 4, row: 0 });
    view.render(state);

    const recentRing = container.querySelector('circle.recent-move-to');
    expect(recentRing).not.toBeNull();
    // col 4 cx is 4 * 100 + 50 = 450, row 0 cy is (5 - 0) * 100 + 50 = 550
    expect(recentRing?.getAttribute('cx')).toBe('450');
    expect(recentRing?.getAttribute('cy')).toBe('550');
  });

  it('renders winning alignment connecting line and halos when winningCells are present', () => {
    let state = createInitialConnectFourState();
    state.winner = 1;
    state.winReason = 'connect4';
    state.winningCells = [
      { column: 0, row: 0 },
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 3, row: 0 },
    ];
    view.render(state);

    const winGroup = container.querySelector('.c4-winning-line-group');
    expect(winGroup).not.toBeNull();

    const line = winGroup?.querySelector('line');
    expect(line).not.toBeNull();
    // Col 0 row 0 -> cx 50, cy 550. Col 3 row 0 -> cx 350, cy 550
    expect(line?.getAttribute('x1')).toBe('50');
    expect(line?.getAttribute('y1')).toBe('550');
    expect(line?.getAttribute('x2')).toBe('350');
    expect(line?.getAttribute('y2')).toBe('550');

    const halos = winGroup?.querySelectorAll('circle');
    expect(halos?.length).toBe(4);
  });
});
