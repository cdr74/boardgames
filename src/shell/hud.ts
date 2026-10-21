import { DIFFICULTY_LABELS } from '../platform/engine/difficulty';
import { DifficultyLevel, Player } from '../platform/types';

export interface HudCallbacks {
  onBackToMenu: () => void;
  onDifficultyChange: (level: DifficultyLevel) => void;
  onPlayerColorChange: (color: Player) => void;
  onUndo: () => void;
  onNewGame: () => void;
}

export class HudView {
  private container: HTMLElement;
  private callbacks: HudCallbacks;

  constructor(container: HTMLElement, callbacks: HudCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public render(
    gameTitle: string,
    currentDifficulty: DifficultyLevel,
    playerColor: Player,
    canUndo: boolean,
    statusMessage: string,
    playerLabels?: { player1: string; player2: string }
  ): void {
    const p1Label = playerLabels?.player1 ?? 'White (1st)';
    const p2Label = playerLabels?.player2 ?? 'Black (2nd)';

    this.container.innerHTML = `
      <div class="hud-bar">
        <div class="hud-left">
          <button id="btn-back-to-menu" class="btn-nav" title="Return to Games Menu">
            ← Games Menu
          </button>
          <div class="hud-game-title">${gameTitle}</div>
        </div>

        <div class="hud-center">
          <div class="hud-status" id="hud-status-text">${statusMessage}</div>
        </div>

        <div class="hud-right">
          <div class="control-group">
            <label for="select-color">You play:</label>
            <select id="select-color" class="hud-select">
              <option value="1" ${playerColor === 1 ? 'selected' : ''}>${p1Label}</option>
              <option value="2" ${playerColor === 2 ? 'selected' : ''}>${p2Label}</option>
            </select>
          </div>

          <div class="control-group">
            <label for="select-difficulty">Engine:</label>
            <select id="select-difficulty" class="hud-select">
              ${([1, 2, 3, 4, 5] as DifficultyLevel[])
                .map(
                  (lvl) => `
                <option value="${lvl}" ${lvl === currentDifficulty ? 'selected' : ''}>
                  L${lvl}: ${DIFFICULTY_LABELS[lvl].name}
                </option>
              `
                )
                .join('')}
            </select>
          </div>

          <button id="btn-undo" class="btn-action" ${!canUndo ? 'disabled' : ''}>Undo</button>
          <button id="btn-new-game" class="btn-action">New Game</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  public updateStatus(statusMessage: string): void {
    const el = this.container.querySelector('#hud-status-text');
    if (el) {
      el.textContent = statusMessage;
    }
  }

  public setUndoEnabled(enabled: boolean): void {
    const btn = this.container.querySelector<HTMLButtonElement>('#btn-undo');
    if (btn) {
      btn.disabled = !enabled;
    }
  }

  private attachEvents(): void {
    const btnMenu = this.container.querySelector('#btn-back-to-menu');
    btnMenu?.addEventListener('click', () => this.callbacks.onBackToMenu());

    const selDiff = this.container.querySelector<HTMLSelectElement>('#select-difficulty');
    selDiff?.addEventListener('change', () => {
      const lvl = parseInt(selDiff.value, 10) as DifficultyLevel;
      this.callbacks.onDifficultyChange(lvl);
    });

    const selColor = this.container.querySelector<HTMLSelectElement>('#select-color');
    selColor?.addEventListener('change', () => {
      const col = parseInt(selColor.value, 10) as Player;
      this.callbacks.onPlayerColorChange(col);
    });

    const btnUndo = this.container.querySelector('#btn-undo');
    btnUndo?.addEventListener('click', () => this.callbacks.onUndo());

    const btnNew = this.container.querySelector('#btn-new-game');
    btnNew?.addEventListener('click', () => this.callbacks.onNewGame());
  }
}
