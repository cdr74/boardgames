import './style.css';
import { GAME_REGISTRY } from './games/registry';
import { LobbyView } from './shell/lobby';
import { GameSession } from './shell/session';

class App {
  private root: HTMLElement;
  private currentSession: GameSession | null = null;

  constructor() {
    this.root = document.getElementById('app')!;
    this.showLobby();
  }

  public showLobby(): void {
    if (this.currentSession) {
      this.currentSession = null;
    }

    const lobby = new LobbyView(this.root, {
      onSelectGame: (gameId) => this.launchGame(gameId),
    });

    lobby.render();
  }

  public launchGame(gameId: string): void {
    const gameMeta = GAME_REGISTRY.find((g) => g.id === gameId);
    if (!gameMeta || gameMeta.status !== 'playable') return;

    this.currentSession = new GameSession(this.root, gameMeta, {
      onReturnToLobby: () => this.showLobby(),
    });

    this.currentSession.start();
  }
}

new App();
