import { GameMetadata } from '../games/registry';
import { BoardView } from '../games/morris/ui/board-view';
import { formatStatusMessage, getOpponent, getPlayerColorName } from '../games/morris/ui/ui-helpers';
import { ADJACENCY_LIST } from '../games/morris/constants';
import { cloneGameState, createInitialGameState, getPlayerPhase } from '../games/morris/board';
import { applyMove, formsMillOnMove, getValidCaptureTargets } from '../games/morris/rules';
import { EMPTY, GameState, Move, PointId } from '../games/morris/types';
import { EngineClient } from '../platform/worker/client';
import { DIFFICULTY_CONFIGS } from '../platform/engine/difficulty';
import { DifficultyLevel, Player } from '../platform/types';
import { HudView } from './hud';

export interface SessionCallbacks {
  onReturnToLobby: () => void;
}

export class GameSession {
  private container: HTMLElement;
  private gameMeta: GameMetadata;
  private callbacks: SessionCallbacks;

  private hudContainer!: HTMLElement;
  private boardContainer!: HTMLElement;
  private modalContainer!: HTMLElement;

  private hudView!: HudView;
  private boardView?: BoardView;
  private engineClient: EngineClient;

  // Morris state
  private state: GameState;
  private undoStack: GameState[] = [];
  private humanPlayer: Player = 1;
  private currentDifficulty: DifficultyLevel = 3;
  private isEngineThinking = false;
  private selectedPoint: PointId | null = null;
  private pendingCaptureBaseMove: { type: 'place' | 'slide' | 'fly'; from?: PointId; to: PointId } | null = null;
  private stateBeforeCapture: GameState | null = null;

  constructor(container: HTMLElement, gameMeta: GameMetadata, callbacks: SessionCallbacks) {
    this.container = container;
    this.gameMeta = gameMeta;
    this.callbacks = callbacks;
    this.state = createInitialGameState();
    this.engineClient = new EngineClient();
  }

  public start(): void {
    this.container.innerHTML = `
      <div class="session-layout">
        <div id="session-hud"></div>
        <div class="session-main">
          <div id="session-board"></div>
        </div>
        <div id="session-modal" class="modal-overlay hidden">
          <div class="modal-card">
            <h2 id="modal-title" class="modal-title"></h2>
            <p id="modal-desc" class="modal-desc"></p>
            <button id="btn-modal-restart" class="btn-play-game">Play Again</button>
          </div>
        </div>
      </div>
    `;

    this.hudContainer = this.container.querySelector('#session-hud')!;
    this.boardContainer = this.container.querySelector('#session-board')!;
    this.modalContainer = this.container.querySelector('#session-modal')!;

    this.hudView = new HudView(this.hudContainer, {
      onBackToMenu: () => {
        this.engineClient.terminate();
        this.callbacks.onReturnToLobby();
      },
      onDifficultyChange: (lvl) => {
        this.currentDifficulty = lvl;
        this.updateHUD();
      },
      onPlayerColorChange: (color) => {
        this.humanPlayer = color;
        this.startNewGame();
      },
      onUndo: () => this.handleUndo(),
      onNewGame: () => this.startNewGame(),
    });

    if (this.gameMeta.id === 'nine-mens-morris') {
      this.boardView = new BoardView(this.boardContainer, {
        onPointClick: (pt) => this.handleMorrisPointClick(pt),
      });
    }

    const btnRestart = this.container.querySelector('#btn-modal-restart');
    btnRestart?.addEventListener('click', () => {
      this.modalContainer.classList.add('hidden');
      this.startNewGame();
    });

    this.startNewGame();
  }

  public async startNewGame(): Promise<void> {
    if (this.isEngineThinking) return;
    this.state = createInitialGameState();
    this.undoStack = [];
    this.selectedPoint = null;
    this.pendingCaptureBaseMove = null;
    this.stateBeforeCapture = null;
    this.boardView?.clearVisualFeedback();
    this.modalContainer.classList.add('hidden');

    this.hudView.render(
      this.gameMeta.name,
      this.currentDifficulty,
      this.humanPlayer,
      false,
      this.getStatusMessage()
    );

    this.updateBoard();

    if (this.humanPlayer === 2 && this.state.turn === 1) {
      await this.triggerEngineMove();
    }
  }

  private getStatusMessage(): string {
    return formatStatusMessage({
      state: this.state,
      humanPlayer: this.humanPlayer,
      difficulty: this.currentDifficulty,
      isPendingCapture: this.state.pendingCapture,
      isEngineThinking: this.isEngineThinking,
    });
  }

  private updateHUD(): void {
    const msg = this.getStatusMessage();
    this.hudView.updateStatus(msg);
    this.hudView.setUndoEnabled(this.undoStack.length > 0 && !this.isEngineThinking);
  }

  private updateBoard(): void {
    if (!this.boardView) return;
    this.boardView.render(this.state);

    if (this.state.winner !== null) {
      this.showGameOverModal();
    }
  }

  private async handleMorrisPointClick(pt: PointId): Promise<void> {
    if (this.isEngineThinking || this.state.winner !== null) return;
    if (this.state.turn !== this.humanPlayer) return;

    if (this.state.pendingCapture) {
      const validCaptures = getValidCaptureTargets(this.state.board, getOpponent(this.humanPlayer));
      if (validCaptures.includes(pt)) {
        this.undoStack.push(this.stateBeforeCapture!);
        const move: Move = {
          ...this.pendingCaptureBaseMove!,
          capture: pt,
        };

        this.state = applyMove(this.stateBeforeCapture!, move);
        this.pendingCaptureBaseMove = null;
        this.stateBeforeCapture = null;
        this.boardView?.clearVisualFeedback();
        this.boardView?.setLastCaptured(pt);
        this.updateHUD();
        this.updateBoard();

        if (this.state.winner === null && this.state.turn !== this.humanPlayer) {
          await this.triggerEngineMove();
        }
      }
      return;
    }

    const phase = getPlayerPhase(this.state, this.humanPlayer);

    if (phase === 'placement') {
      if (this.state.board[pt] !== EMPTY) return;

      const isMill = formsMillOnMove(this.state.board, undefined, pt, this.humanPlayer);
      if (isMill) {
        const nextBoard = [...this.state.board];
        nextBoard[pt] = this.humanPlayer;
        const validCaptures = getValidCaptureTargets(nextBoard, getOpponent(this.humanPlayer));

        if (validCaptures.length > 0) {
          this.stateBeforeCapture = cloneGameState(this.state);
          this.pendingCaptureBaseMove = { type: 'place', to: pt };
          this.state.pendingCapture = true;
          this.boardView?.setRecentMove(undefined, pt);
          this.boardView?.setCaptureTargets(validCaptures);
          this.updateHUD();
          return;
        }
      }

      this.undoStack.push(cloneGameState(this.state));
      this.state = applyMove(this.state, { type: 'place', to: pt });
      this.boardView?.setRecentMove(undefined, pt);
      this.updateHUD();
      this.updateBoard();

      if (this.state.winner === null && this.state.turn !== this.humanPlayer) {
        await this.triggerEngineMove();
      }
      return;
    }

    if (phase === 'movement' || phase === 'flying') {
      if (this.state.board[pt] === this.humanPlayer) {
        this.selectedPoint = pt;
        const legalDests = this.getLegalDestinations(pt, phase);
        this.boardView?.setSelectedPoint(pt);
        this.boardView?.setHighlightedPoints(legalDests);
        return;
      }

      if (this.selectedPoint !== null && this.state.board[pt] === EMPTY) {
        const legalDests = this.getLegalDestinations(this.selectedPoint, phase);
        if (!legalDests.includes(pt)) return;

        const moveType = phase === 'flying' ? 'fly' : 'slide';
        const isMill = formsMillOnMove(this.state.board, this.selectedPoint, pt, this.humanPlayer);

        if (isMill) {
          const nextBoard = [...this.state.board];
          nextBoard[this.selectedPoint] = EMPTY;
          nextBoard[pt] = this.humanPlayer;
          const validCaptures = getValidCaptureTargets(nextBoard, getOpponent(this.humanPlayer));

          if (validCaptures.length > 0) {
            this.stateBeforeCapture = cloneGameState(this.state);
            this.pendingCaptureBaseMove = { type: moveType, from: this.selectedPoint, to: pt };
            this.state.pendingCapture = true;
            this.boardView?.setRecentMove(this.selectedPoint, pt);
            this.boardView?.setCaptureTargets(validCaptures);
            this.selectedPoint = null;
            this.updateHUD();
            return;
          }
        }

        this.undoStack.push(cloneGameState(this.state));
        this.state = applyMove(this.state, {
          type: moveType,
          from: this.selectedPoint,
          to: pt,
        });

        this.boardView?.setRecentMove(this.selectedPoint, pt);
        this.selectedPoint = null;
        this.boardView?.clearVisualFeedback();
        this.updateHUD();
        this.updateBoard();

        if (this.state.winner === null && this.state.turn !== this.humanPlayer) {
          await this.triggerEngineMove();
        }
      }
    }
  }

  private getLegalDestinations(from: PointId, phase: 'movement' | 'flying'): PointId[] {
    if (phase === 'flying') {
      const dests: PointId[] = [];
      for (let i = 0; i < 24; i++) {
        if (this.state.board[i as PointId] === EMPTY) dests.push(i as PointId);
      }
      return dests;
    }
    return ADJACENCY_LIST[from].filter((adj) => this.state.board[adj] === EMPTY);
  }

  private async triggerEngineMove(): Promise<void> {
    this.isEngineThinking = true;
    this.hudView.updateStatus(`Engine thinking (Level ${this.currentDifficulty})...`);

    const config = DIFFICULTY_CONFIGS[this.currentDifficulty];

    try {
      const searchPromise = this.engineClient.search<GameState, Move>(
        'nine-mens-morris',
        this.state,
        config
      );
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 350));
      const [result] = await Promise.all([searchPromise, delayPromise]);

      this.executeEngineMove(result.bestMove);
    } catch (err) {
      console.error('Engine error:', err);
    } finally {
      this.isEngineThinking = false;
      this.updateHUD();
    }
  }

  private async executeEngineMove(move: Move): Promise<void> {
    const opp = getOpponent(this.humanPlayer);

    if (move.capture !== undefined) {
      const interimState = cloneGameState(this.state);
      if (move.type === 'place') {
        interimState.board[move.to] = opp;
        if (opp === 1) interimState.whitePiecesInHand--;
        else interimState.blackPiecesInHand--;
      } else if (move.from !== undefined) {
        interimState.board[move.from] = EMPTY;
        interimState.board[move.to] = opp;
      }

      this.boardView?.setRecentMove(move.from, move.to);
      this.boardView?.setStagedCaptureTarget(move.capture);
      this.boardView?.render(interimState);
      this.hudView.updateStatus(`Engine closed a mill and captures piece at point ${move.capture}!`);

      await new Promise((resolve) => setTimeout(resolve, 550));
    }

    this.boardView?.setRecentMove(move.from, move.to);
    if (move.capture !== undefined) {
      this.boardView?.setLastCaptured(move.capture);
    }

    this.state = applyMove(this.state, move);
    this.updateHUD();
    this.updateBoard();
  }

  private handleUndo(): void {
    if (this.undoStack.length === 0 || this.isEngineThinking) return;

    this.state = this.undoStack.pop()!;
    this.selectedPoint = null;
    this.pendingCaptureBaseMove = null;
    this.stateBeforeCapture = null;
    this.boardView?.clearVisualFeedback();
    this.modalContainer.classList.add('hidden');
    this.updateHUD();
    this.updateBoard();
  }

  private showGameOverModal(): void {
    const modalTitle = this.modalContainer.querySelector('#modal-title')!;
    const modalDesc = this.modalContainer.querySelector('#modal-desc')!;

    if (this.state.winner === 'draw') {
      modalTitle.textContent = 'Game Draw!';
      modalDesc.textContent =
        this.state.winReason === 'repetition'
          ? 'Draw by Threefold Repetition.'
          : 'Draw by 50-Move Rule (no captures).';
    } else if (this.state.winner === this.humanPlayer) {
      modalTitle.textContent = 'Victory!';
      modalDesc.textContent = `Congratulations! You won by ${this.state.winReason === 'trapped' ? 'trapping all opponent pieces' : 'reducing opponent below 3 pieces'}.`;
    } else {
      modalTitle.textContent = 'Defeat';
      modalDesc.textContent = `The engine (${getPlayerColorName(getOpponent(this.humanPlayer))}) won this match.`;
    }

    this.modalContainer.classList.remove('hidden');
  }
}
