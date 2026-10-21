// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../../src/shell/session';
import { GAME_REGISTRY } from '../../src/games/registry';

describe('GameSession Universal Controller (TASK-207)', () => {
  let container: HTMLDivElement;
  let returnedToLobby: boolean;

  beforeEach(() => {
    container = document.createElement('div');
    returnedToLobby = false;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('initializes and renders a Nine Men Morris session', () => {
    const morrisMeta = GAME_REGISTRY.find((g) => g.id === 'nine-mens-morris')!;
    const session = new GameSession(container, morrisMeta, {
      onReturnToLobby: () => {
        returnedToLobby = true;
      },
    });

    session.start();

    const titleEl = container.querySelector('.hud-game-title');
    expect(titleEl?.textContent).toBe("Nine Men's Morris");

    const morrisSvg = container.querySelector('svg.game-board-svg');
    expect(morrisSvg).not.toBeNull();
    expect(morrisSvg?.getAttribute('aria-label')).toBe("Nine Men's Morris Game Board");
  });

  it('initializes and renders an English Checkers session with 8x8 board and custom color labels', () => {
    const checkersMeta = GAME_REGISTRY.find((g) => g.id === 'checkers')!;
    const session = new GameSession(container, checkersMeta, {
      onReturnToLobby: () => {
        returnedToLobby = true;
      },
    });

    session.start();

    const titleEl = container.querySelector('.hud-game-title');
    expect(titleEl?.textContent).toBe('English Checkers');

    const checkersSvg = container.querySelector('svg.checkers-board-svg');
    expect(checkersSvg).not.toBeNull();
    expect(checkersSvg?.getAttribute('aria-label')).toBe('English Checkers Game Board');

    // Check color dropdown labels: Black (1st), White (2nd)
    const selectColor = container.querySelector<HTMLSelectElement>('#select-color');
    expect(selectColor).not.toBeNull();
    const options = Array.from(selectColor?.querySelectorAll('option') ?? []).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Black (1st)', 'White (2nd)']);
  });

  it('handles human move interaction and undo in Checkers session', async () => {
    const checkersMeta = GAME_REGISTRY.find((g) => g.id === 'checkers')!;
    const session = new GameSession(container, checkersMeta, {
      onReturnToLobby: () => {
        returnedToLobby = true;
      },
    });

    session.start();

    // In initial state, squares 20..23 have Black pieces.
    // Click square 21 (row 5, col 2): should show destinations 16 and 17.
    const sq21 = container.querySelector<SVGGElement>('g[data-square-index="21"]');
    expect(sq21).not.toBeNull();
    sq21?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const destHighlights = container.querySelectorAll('circle.dest-highlight');
    expect(destHighlights.length).toBe(2);

    // Click destination square 17
    const sq17 = container.querySelector<SVGGElement>('g[data-square-index="17"]');
    expect(sq17).not.toBeNull();
    sq17?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Square 17 should now have recent-move-to highlight
    const recentTo = container.querySelector('rect.recent-move-to');
    expect(recentTo).not.toBeNull();

    // Undo button should be enabled
    const btnUndo = container.querySelector<HTMLButtonElement>('#btn-undo');
    expect(btnUndo?.disabled).toBe(false);

    // Click Undo
    btnUndo?.click();

    // Highlights cleared and undo applied
    const destsAfterUndo = container.querySelectorAll('circle.dest-highlight');
    expect(destsAfterUndo.length).toBe(0);
  });

  it('handles Morris piece selection, highlighting, and sliding movement in movement phase', async () => {
    const morrisMeta = GAME_REGISTRY.find((g) => g.id === 'nine-mens-morris')!;
    const session = new GameSession(container, morrisMeta, {
      onReturnToLobby: () => {
        returnedToLobby = true;
      },
    });

    session.start();

    // Transition session state into movement phase: 0 pieces in hand, White at point 0, point 1 empty
    const sessionAny = session as any;
    sessionAny.morrisState.whitePiecesInHand = 0;
    sessionAny.morrisState.blackPiecesInHand = 0;
    sessionAny.morrisState.whitePiecesOnBoard = 4;
    sessionAny.morrisState.blackPiecesOnBoard = 4;
    sessionAny.morrisState.turn = 1;
    sessionAny.morrisState.board.fill(0);
    sessionAny.morrisState.board[0] = 1; // White piece
    sessionAny.morrisState.board[9] = 1; // White piece
    sessionAny.morrisState.board[16] = 1; // White piece
    sessionAny.morrisState.board[21] = 1; // White piece
    sessionAny.morrisState.board[2] = 2; // Black piece
    sessionAny.morrisState.board[4] = 2; // Black piece
    sessionAny.morrisState.board[10] = 2; // Black piece
    sessionAny.morrisState.board[18] = 2; // Black piece
    sessionAny.updateBoard();

    // Click White piece at point 0: Point 0 has neighbors 1 and 7. Both are empty.
    const pt0 = container.querySelector<SVGGElement>('g[data-point-id="0"]');
    expect(pt0).not.toBeNull();
    pt0?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Selection halo should be visible on point 0
    const halo = container.querySelector('circle.selection-halo');
    expect(halo).not.toBeNull();

    // Destination highlights should be visible on adjacent empty points (points 1 and 7)
    const destHighlights = container.querySelectorAll('circle.dest-highlight');
    expect(destHighlights.length).toBe(2);

    // Click adjacent point 1 to slide piece
    const pt1 = container.querySelector<SVGGElement>('g[data-point-id="1"]');
    expect(pt1).not.toBeNull();
    pt1?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Point 0 should now be empty and Point 1 should contain White piece
    expect(sessionAny.morrisState.board[0]).toBe(0);
    expect(sessionAny.morrisState.board[1]).toBe(1);

    // Selection halo and highlights should be cleared
    const haloAfter = container.querySelector('circle.selection-halo');
    expect(haloAfter).toBeNull();
  });

  it('initializes and handles human column drop and undo in Connect Four session', async () => {
    const c4Meta = GAME_REGISTRY.find((g) => g.id === 'connect-four')!;
    const session = new GameSession(container, c4Meta, {
      onReturnToLobby: () => {
        returnedToLobby = true;
      },
    });

    session.start();

    const titleEl = container.querySelector('.hud-game-title');
    expect(titleEl?.textContent).toBe('Connect Four');

    const c4Svg = container.querySelector('svg.connect-four-board-svg');
    expect(c4Svg).not.toBeNull();
    expect(c4Svg?.getAttribute('aria-label')).toBe('Connect Four Game Board');

    // Color dropdown should have Red (1st) and Yellow (2nd)
    const selectColor = container.querySelector<HTMLSelectElement>('#select-color');
    expect(selectColor).not.toBeNull();
    const options = Array.from(selectColor?.querySelectorAll('option') ?? []).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Red (1st)', 'Yellow (2nd)']);

    // Click column 3 to drop a disc
    const col3 = container.querySelector<SVGGElement>('g[data-column="3"]');
    expect(col3).not.toBeNull();
    col3?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    // A Red disc should now exist at col 3, row 0
    const redDiscs = container.querySelectorAll('.c4-disc.disc-red');
    expect(redDiscs.length).toBe(1);

    // Recent move ring should be present
    const recentRing = container.querySelector('circle.recent-move-to');
    expect(recentRing).not.toBeNull();

    // Undo button should be enabled
    const btnUndo = container.querySelector<HTMLButtonElement>('#btn-undo');
    expect(btnUndo?.disabled).toBe(false);

    // Click Undo
    btnUndo?.click();

    // Red disc should be removed
    const redDiscsAfter = container.querySelectorAll('.c4-disc.disc-red');
    expect(redDiscsAfter.length).toBe(0);
  });

  it('initializes and handles human square placement and undo in Reversi session', async () => {
    const reversiMeta = GAME_REGISTRY.find((g) => g.id === 'reversi')!;
    const session = new GameSession(container, reversiMeta, {
      onReturnToLobby: () => {
        returnedToLobby = true;
      },
    });

    session.start();

    const titleEl = container.querySelector('.hud-game-title');
    expect(titleEl?.textContent).toBe('Reversi');

    const reversiSvg = container.querySelector('svg.reversi-board-svg');
    expect(reversiSvg).not.toBeNull();
    expect(reversiSvg?.getAttribute('aria-label')).toBe('Reversi Game Board');

    // Color dropdown should have Black (1st) and White (2nd)
    const selectColor = container.querySelector<HTMLSelectElement>('#select-color');
    expect(selectColor).not.toBeNull();
    const options = Array.from(selectColor?.querySelectorAll('option') ?? []).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Black (1st)', 'White (2nd)']);

    // Initial state has 4 legal move dots for Black
    const legalDots = container.querySelectorAll('.reversi-legal-dots circle');
    expect(legalDots.length).toBe(4);

    // Click legal square 19
    const sq19 = container.querySelector<SVGGElement>('g[data-square-index="19"]');
    expect(sq19).not.toBeNull();
    sq19?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Disc at 19 is now Black and disc at 27 is flipped to Black
    const disc19 = container.querySelector('.reversi-disc[data-square-index="19"]');
    expect(disc19?.classList.contains('disc-black')).toBe(true);
    const disc27 = container.querySelector('.reversi-disc[data-square-index="27"]');
    expect(disc27?.classList.contains('disc-black')).toBe(true);

    // Recent move ring is present
    const recentRing = container.querySelector('circle.recent-move-to');
    expect(recentRing).not.toBeNull();

    // Undo button should be enabled
    const btnUndo = container.querySelector<HTMLButtonElement>('#btn-undo');
    expect(btnUndo?.disabled).toBe(false);

    // Click Undo
    btnUndo?.click();

    // Disc 19 is removed, and disc 27 is reverted back to White
    const disc19After = container.querySelector('.reversi-disc[data-square-index="19"]');
    expect(disc19After).toBeNull();
    const disc27After = container.querySelector('.reversi-disc[data-square-index="27"]');
    expect(disc27After?.classList.contains('disc-white')).toBe(true);
  });

  it('triggers onReturnToLobby when clicking the Back to Menu button', () => {
    const checkersMeta = GAME_REGISTRY.find((g) => g.id === 'checkers')!;
    const session = new GameSession(container, checkersMeta, {
      onReturnToLobby: () => {
        returnedToLobby = true;
      },
    });

    session.start();

    const btnBack = container.querySelector<HTMLButtonElement>('#btn-back-to-menu');
    btnBack?.click();

    expect(returnedToLobby).toBe(true);
  });

  it('delays game over modal by 1.2s and allows reviewing the final board', () => {
    vi.useFakeTimers();
    try {
      const c4Meta = GAME_REGISTRY.find((g) => g.id === 'connect-four')!;
      const session = new GameSession(container, c4Meta, {
        onReturnToLobby: () => {},
      });

      session.start();

      const modalOverlay = container.querySelector<HTMLDivElement>('#session-modal')!;
      const sessionAny = session as any;

      // Simulate match ending with human victory
      sessionAny.connectFourState.winner = 1;
      sessionAny.connectFourState.winReason = 'connect4';
      sessionAny.updateBoard();

      // Immediately after win, modal MUST be hidden so user sees the winning alignment
      expect(modalOverlay.classList.contains('hidden')).toBe(true);

      // Advance by 600ms: still hidden
      vi.advanceTimersByTime(600);
      expect(modalOverlay.classList.contains('hidden')).toBe(true);

      // Advance remaining 600ms (total 1200ms): modal should now be visible
      vi.advanceTimersByTime(600);
      expect(modalOverlay.classList.contains('hidden')).toBe(false);

      const titleEl = container.querySelector('#modal-title');
      expect(titleEl?.textContent).toBe('Victory!');

      // Click "Review Board" button
      const btnReview = container.querySelector<HTMLButtonElement>('#btn-modal-review')!;
      expect(btnReview).not.toBeNull();
      btnReview.click();

      // Modal should be dismissed so user can inspect the final board at leisure
      expect(modalOverlay.classList.contains('hidden')).toBe(true);

      // Board is still intact
      const boardSvg = container.querySelector('svg.connect-four-board-svg');
      expect(boardSvg).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('allows restarting a new match from the game over modal', () => {
    vi.useFakeTimers();
    try {
      const reversiMeta = GAME_REGISTRY.find((g) => g.id === 'reversi')!;
      const session = new GameSession(container, reversiMeta, {
        onReturnToLobby: () => {},
      });

      session.start();

      const modalOverlay = container.querySelector<HTMLDivElement>('#session-modal')!;
      const sessionAny = session as any;

      // Simulate defeat
      sessionAny.reversiState.winner = 2;
      sessionAny.reversiState.winReason = 'discs';
      sessionAny.reversiState.blackCount = 20;
      sessionAny.reversiState.whiteCount = 44;
      sessionAny.updateBoard();

      vi.advanceTimersByTime(1200);
      expect(modalOverlay.classList.contains('hidden')).toBe(false);

      const titleEl = container.querySelector('#modal-title');
      expect(titleEl?.textContent).toBe('Defeat');

      // Click "Play Again"
      const btnRestart = container.querySelector<HTMLButtonElement>('#btn-modal-restart')!;
      btnRestart.click();

      // Modal is hidden and fresh state is initialized
      expect(modalOverlay.classList.contains('hidden')).toBe(true);
      expect(sessionAny.reversiState.winner).toBeNull();
      expect(sessionAny.reversiState.blackCount).toBe(2);
      expect(sessionAny.reversiState.whiteCount).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels scheduled game over modal if user restarts before timer fires', () => {
    vi.useFakeTimers();
    try {
      const morrisMeta = GAME_REGISTRY.find((g) => g.id === 'nine-mens-morris')!;
      const session = new GameSession(container, morrisMeta, {
        onReturnToLobby: () => {},
      });

      session.start();

      const modalOverlay = container.querySelector<HTMLDivElement>('#session-modal')!;
      const sessionAny = session as any;

      // Trigger game over
      sessionAny.morrisState.winner = 1;
      sessionAny.updateBoard();

      // Before timer fires (e.g. 500ms), user starts a new game
      vi.advanceTimersByTime(500);
      session.startNewGame();

      // Advance past remaining time
      vi.advanceTimersByTime(1000);

      // Modal should NOT be shown
      expect(modalOverlay.classList.contains('hidden')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
