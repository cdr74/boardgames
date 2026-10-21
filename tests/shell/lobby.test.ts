// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { LobbyView } from '../../src/shell/lobby';
import { GAME_REGISTRY } from '../../src/games/registry';

describe('LobbyView Overview Page', () => {
  let container: HTMLDivElement;
  let selectedGameId: string | null;
  let lobby: LobbyView;

  beforeEach(() => {
    container = document.createElement('div');
    selectedGameId = null;
    lobby = new LobbyView(container, {
      onSelectGame: (id) => {
        selectedGameId = id;
      },
    });
  });

  it('renders all registered games in the lobby grid', () => {
    lobby.render();

    const cards = container.querySelectorAll('.game-card');
    expect(cards.length).toBe(GAME_REGISTRY.length);

    for (const game of GAME_REGISTRY) {
      const card = Array.from(cards).find((c) =>
        c.querySelector('.card-title')?.textContent?.includes(game.name)
      );
      expect(card).toBeDefined();
      expect(card?.querySelector('.card-desc')?.textContent).toBe(game.description);
    }
  });

  it('does NOT render small subtitles (.card-subtitle) on game cards', () => {
    lobby.render();

    const subtitles = container.querySelectorAll('.card-subtitle');
    expect(subtitles.length).toBe(0);

    // Verify none of the registry subtitles appear inside any game card
    for (const game of GAME_REGISTRY) {
      const sub = game.subtitle;
      if (sub) {
        const matchingElements = Array.from(container.querySelectorAll('.game-card')).filter((c) =>
          c.textContent?.includes(sub)
        );
        expect(matchingElements.length).toBe(0);
      }
    }
  });

  it('triggers onSelectGame when clicking an enabled Play Game button', () => {
    lobby.render();

    const playBtns = container.querySelectorAll<HTMLButtonElement>('.btn-play-game:not(.disabled)');
    expect(playBtns.length).toBe(3); // Morris, Checkers, and Connect Four

    // Test Morris button
    playBtns[0].click();
    expect(selectedGameId).toBe('nine-mens-morris');

    // Test Checkers button
    playBtns[1].click();
    expect(selectedGameId).toBe('checkers');

    // Test Connect Four button
    playBtns[2].click();
    expect(selectedGameId).toBe('connect-four');
  });

  it('disables play buttons for games in scaffolding or planning', () => {
    lobby.render();

    const disabledBtns = container.querySelectorAll<HTMLButtonElement>('.btn-play-game.disabled');
    expect(disabledBtns.length).toBeGreaterThan(0);

    disabledBtns.forEach((btn) => {
      expect(btn.disabled).toBe(true);
      btn.click();
    });

    expect(selectedGameId).toBeNull();
  });
});
