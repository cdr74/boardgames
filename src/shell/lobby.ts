import { GAME_REGISTRY, GameMetadata } from '../games/registry';

export interface LobbyCallbacks {
  onSelectGame: (gameId: string) => void;
}

export class LobbyView {
  private container: HTMLElement;
  private callbacks: LobbyCallbacks;

  constructor(container: HTMLElement, callbacks: LobbyCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="lobby-container">
        <header class="lobby-header">
          <h1 class="lobby-title">Classic Board Games</h1>
          <p class="lobby-subtitle">Choose a game to play against the computer (Levels 1–5)</p>
        </header>

        <div class="lobby-grid">
          ${GAME_REGISTRY.map((game) => this.renderGameCard(game)).join('')}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderGameCard(game: GameMetadata): string {
    const isPlayable = game.status === 'playable';
    const statusBadge = isPlayable
      ? '<span class="status-badge playable">Ready to Play</span>'
      : `<span class="status-badge upcoming">${game.badgeText || 'Planned'}</span>`;

    const buttonHtml = isPlayable
      ? `<button class="btn-play-game" data-game-id="${game.id}">Play Game</button>`
      : `<button class="btn-play-game disabled" disabled>In Scaffolding</button>`;

    return `
      <div class="game-card ${game.status}">
        <div class="card-header">
          <h2 class="card-title">${game.name}</h2>
          ${statusBadge}
        </div>
        <p class="card-desc">${game.description}</p>
        <div class="card-actions">
          ${buttonHtml}
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const buttons = this.container.querySelectorAll<HTMLButtonElement>('.btn-play-game:not(.disabled)');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const gameId = btn.getAttribute('data-game-id');
        if (gameId) {
          this.callbacks.onSelectGame(gameId);
        }
      });
    });
  }
}
