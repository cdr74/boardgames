import { GameMetadata } from '../games/registry';
import { BoardView as MorrisBoardView } from '../games/morris/ui/board-view';
import {
  formatStatusMessage as formatMorrisStatusMessage,
  getOpponent as getMorrisOpponent,
  getPlayerColorName as getMorrisColorName,
} from '../games/morris/ui/ui-helpers';
import { ADJACENCY_LIST as MORRIS_ADJACENCY_LIST } from '../games/morris/constants';
import {
  cloneGameState as cloneMorrisState,
  createInitialGameState as createInitialMorrisState,
  getPlayerPhase as getMorrisPhase,
} from '../games/morris/board';
import {
  applyMove as applyMorrisMove,
  formsMillOnMove,
  getValidCaptureTargets,
} from '../games/morris/rules';
import { EMPTY as MORRIS_EMPTY, GameState as MorrisState, Move as MorrisMove, PointId } from '../games/morris/types';

import { CheckersBoardView } from '../games/checkers/ui/board-view';
import {
  formatStatusMessage as formatCheckersStatusMessage,
  getPlayerColorName as getCheckersColorName,
} from '../games/checkers/ui/ui-helpers';
import {
  cloneCheckersState,
  createInitialCheckersState,
  getOpponent as getCheckersOpponent,
  getPiecePlayer as getCheckersPiecePlayer,
} from '../games/checkers/board';
import { applyMove as applyCheckersMove, getLegalMoves as getCheckersLegalMoves } from '../games/checkers/rules';
import {
  CheckersMove,
  CheckersState,
  SquareIndex,
} from '../games/checkers/types';

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
  private engineClient: EngineClient;

  private humanPlayer: Player = 1;
  private currentDifficulty: DifficultyLevel = 3;
  private isEngineThinking = false;

  // Morris state & view
  private morrisView?: MorrisBoardView;
  private morrisState: MorrisState;
  private morrisUndoStack: MorrisState[] = [];
  private selectedMorrisPoint: PointId | null = null;
  private pendingCaptureBaseMove: { type: 'place' | 'slide' | 'fly'; from?: PointId; to: PointId } | null = null;
  private stateBeforeCapture: MorrisState | null = null;

  // Checkers state & view
  private checkersView?: CheckersBoardView;
  private checkersState: CheckersState;
  private checkersUndoStack: CheckersState[] = [];
  private selectedCheckersSquare: SquareIndex | null = null;

  constructor(container: HTMLElement, gameMeta: GameMetadata, callbacks: SessionCallbacks) {
    this.container = container;
    this.gameMeta = gameMeta;
    this.callbacks = callbacks;
    this.morrisState = createInitialMorrisState();
    this.checkersState = createInitialCheckersState();
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
      this.morrisView = new MorrisBoardView(this.boardContainer, {
        onPointClick: (pt) => this.handleMorrisPointClick(pt),
      });
    } else if (this.gameMeta.id === 'checkers') {
      this.checkersView = new CheckersBoardView(this.boardContainer, {
        onSquareClick: (sq) => this.handleCheckersSquareClick(sq),
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

    this.modalContainer.classList.add('hidden');

    if (this.gameMeta.id === 'nine-mens-morris') {
      this.morrisState = createInitialMorrisState();
      this.morrisUndoStack = [];
      this.selectedMorrisPoint = null;
      this.pendingCaptureBaseMove = null;
      this.stateBeforeCapture = null;
      this.morrisView?.clearVisualFeedback();

      this.hudView.render(
        this.gameMeta.name,
        this.currentDifficulty,
        this.humanPlayer,
        false,
        this.getStatusMessage(),
        { player1: 'White (1st)', player2: 'Black (2nd)' }
      );

      this.updateBoard();

      if (this.humanPlayer === 2 && this.morrisState.turn === 1) {
        await this.triggerMorrisEngineMove();
      }
    } else if (this.gameMeta.id === 'checkers') {
      this.checkersState = createInitialCheckersState();
      this.checkersUndoStack = [];
      this.selectedCheckersSquare = null;
      this.checkersView?.clearVisualFeedback();

      this.hudView.render(
        this.gameMeta.name,
        this.currentDifficulty,
        this.humanPlayer,
        false,
        this.getStatusMessage(),
        { player1: 'Black (1st)', player2: 'White (2nd)' }
      );

      this.updateBoard();

      if (this.humanPlayer === 2 && this.checkersState.turn === 1) {
        await this.triggerCheckersEngineMove();
      }
    }
  }

  private getStatusMessage(): string {
    if (this.gameMeta.id === 'nine-mens-morris') {
      return formatMorrisStatusMessage({
        state: this.morrisState,
        humanPlayer: this.humanPlayer,
        difficulty: this.currentDifficulty,
        isPendingCapture: this.morrisState.pendingCapture,
        isEngineThinking: this.isEngineThinking,
      });
    } else {
      const legalMoves = getCheckersLegalMoves(this.checkersState);
      const hasMandatoryJump = legalMoves.length > 0 && legalMoves[0].isJump;

      return formatCheckersStatusMessage({
        state: this.checkersState,
        humanPlayer: this.humanPlayer,
        difficulty: this.currentDifficulty,
        isEngineThinking: this.isEngineThinking,
        hasMandatoryJump,
      });
    }
  }

  private updateHUD(): void {
    const msg = this.getStatusMessage();
    this.hudView.updateStatus(msg);

    const hasUndo =
      this.gameMeta.id === 'nine-mens-morris'
        ? this.morrisUndoStack.length > 0
        : this.checkersUndoStack.length > 0;
    this.hudView.setUndoEnabled(hasUndo && !this.isEngineThinking);
  }

  private updateBoard(): void {
    if (this.gameMeta.id === 'nine-mens-morris') {
      if (!this.morrisView) return;
      this.morrisView.render(this.morrisState);
      if (this.morrisState.winner !== null) {
        this.showGameOverModal();
      }
    } else if (this.gameMeta.id === 'checkers') {
      if (!this.checkersView) return;
      this.checkersView.render(this.checkersState);
      if (this.checkersState.winner !== null) {
        this.showGameOverModal();
      }
    }
  }

  // ==========================================
  // Checkers Gameplay Interaction
  // ==========================================
  private async handleCheckersSquareClick(sq: SquareIndex): Promise<void> {
    if (this.isEngineThinking || this.checkersState.winner !== null) return;
    if (this.checkersState.turn !== this.humanPlayer) return;

    const allLegalMoves = getCheckersLegalMoves(this.checkersState);
    const hasMandatoryJump = allLegalMoves.length > 0 && allLegalMoves[0].isJump;

    // Check if clicked square has a piece belonging to human
    const piece = this.checkersState.board[sq];
    const pieceOwner = getCheckersPiecePlayer(piece);

    if (pieceOwner === this.humanPlayer) {
      const pieceMoves = allLegalMoves.filter((m) => m.from === sq);

      if (pieceMoves.length === 0) {
        if (hasMandatoryJump) {
          this.hudView.updateStatus('Mandatory capture required! Select a piece that can jump.');
        } else {
          this.hudView.updateStatus('This piece has no legal moves.');
        }
        return;
      }

      if (this.selectedCheckersSquare === sq) {
        // Deselect
        this.selectedCheckersSquare = null;
        this.checkersView?.setSelectedSquare(null);
        this.checkersView?.setHighlightedDestinations([]);
        this.updateHUD();
        this.updateBoard();
        return;
      }

      // Select piece
      this.selectedCheckersSquare = sq;
      this.checkersView?.setSelectedSquare(sq);
      this.checkersView?.setHighlightedDestinations(pieceMoves.map((m) => m.to));
      this.updateBoard();
      return;
    }

    // Destination square clicked while a piece is selected
    if (this.selectedCheckersSquare !== null) {
      const matchingMoves = allLegalMoves.filter(
        (m) => m.from === this.selectedCheckersSquare && m.to === sq
      );

      if (matchingMoves.length > 0) {
        const chosenMove = matchingMoves[0];
        this.checkersUndoStack.push(cloneCheckersState(this.checkersState));

        this.checkersState = applyCheckersMove(this.checkersState, chosenMove);
        this.checkersView?.setRecentMove(chosenMove.from, chosenMove.to, chosenMove.path);
        if (chosenMove.captures.length > 0) {
          this.checkersView?.setLastCaptured(chosenMove.captures);
        }

        this.selectedCheckersSquare = null;
        this.checkersView?.setSelectedSquare(null);
        this.checkersView?.setHighlightedDestinations([]);
        this.updateHUD();
        this.updateBoard();

        if (this.checkersState.winner === null && this.checkersState.turn !== this.humanPlayer) {
          await this.triggerCheckersEngineMove();
        }
      }
    }
  }

  private async triggerCheckersEngineMove(): Promise<void> {
    this.isEngineThinking = true;
    this.hudView.updateStatus(`Engine thinking (Level ${this.currentDifficulty})...`);

    const config = DIFFICULTY_CONFIGS[this.currentDifficulty];

    try {
      const searchPromise = this.engineClient.search<CheckersState, CheckersMove>(
        'checkers',
        this.checkersState,
        config
      );
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 350));
      const [result] = await Promise.all([searchPromise, delayPromise]);

      this.executeCheckersEngineMove(result.bestMove);
    } catch (err) {
      console.error('Checkers engine search error:', err);
    } finally {
      this.isEngineThinking = false;
      this.updateHUD();
    }
  }

  private executeCheckersEngineMove(move: CheckersMove): void {
    if (move.isJump) {
      this.checkersView?.setRecentMove(move.from, move.to, move.path);
      this.checkersView?.setLastCaptured(move.captures);
      this.hudView.updateStatus('Engine executed jump capture!');
    } else {
      this.checkersView?.setRecentMove(move.from, move.to);
    }

    this.checkersState = applyCheckersMove(this.checkersState, move);
    this.updateHUD();
    this.updateBoard();
  }

  // ==========================================
  // Morris Gameplay Interaction
  // ==========================================
  private async handleMorrisPointClick(pt: PointId): Promise<void> {
    if (this.isEngineThinking || this.morrisState.winner !== null) return;
    if (this.morrisState.turn !== this.humanPlayer) return;

    if (this.morrisState.pendingCapture) {
      const validCaptures = getValidCaptureTargets(this.morrisState.board, getMorrisOpponent(this.humanPlayer));
      if (validCaptures.includes(pt)) {
        this.morrisUndoStack.push(this.stateBeforeCapture!);
        const move: MorrisMove = {
          ...this.pendingCaptureBaseMove!,
          capture: pt,
        };

        this.morrisState = applyMorrisMove(this.stateBeforeCapture!, move);
        this.pendingCaptureBaseMove = null;
        this.stateBeforeCapture = null;
        this.morrisView?.clearVisualFeedback();
        this.morrisView?.setLastCaptured(pt);
        this.updateHUD();
        this.updateBoard();

        if (this.morrisState.winner === null && this.morrisState.turn !== this.humanPlayer) {
          await this.triggerMorrisEngineMove();
        }
      }
      return;
    }

    const phase = getMorrisPhase(this.morrisState, this.humanPlayer);

    if (phase === 'placement') {
      if (this.morrisState.board[pt] !== MORRIS_EMPTY) return;

      const isMill = formsMillOnMove(this.morrisState.board, undefined, pt, this.humanPlayer);
      if (isMill) {
        const nextBoard = [...this.morrisState.board];
        nextBoard[pt] = this.humanPlayer;
        const validCaptures = getValidCaptureTargets(nextBoard, getMorrisOpponent(this.humanPlayer));

        if (validCaptures.length > 0) {
          this.stateBeforeCapture = cloneMorrisState(this.morrisState);
          this.pendingCaptureBaseMove = { type: 'place', to: pt };
          this.morrisState.pendingCapture = true;

          const interimState = cloneMorrisState(this.morrisState);
          interimState.board[pt] = this.humanPlayer;
          if (this.humanPlayer === 1) {
            interimState.whitePiecesInHand--;
            interimState.whitePiecesOnBoard++;
          } else {
            interimState.blackPiecesInHand--;
            interimState.blackPiecesOnBoard++;
          }
          interimState.pendingCapture = true;

          this.morrisView?.setRecentMove(undefined, pt);
          this.morrisView?.setCaptureTargets(validCaptures);
          this.morrisView?.render(interimState);
          this.updateHUD();
          return;
        }
      }

      this.morrisUndoStack.push(cloneMorrisState(this.morrisState));
      this.morrisState = applyMorrisMove(this.morrisState, { type: 'place', to: pt });
      this.morrisView?.setRecentMove(undefined, pt);
      this.updateHUD();
      this.updateBoard();

      if (this.morrisState.winner === null && this.morrisState.turn !== this.humanPlayer) {
        await this.triggerMorrisEngineMove();
      }
      return;
    }

    if (phase === 'movement' || phase === 'flying') {
      if (this.morrisState.board[pt] === this.humanPlayer) {
        if (this.selectedMorrisPoint === pt) {
          // Deselect piece
          this.selectedMorrisPoint = null;
          this.morrisView?.setSelectedPoint(null);
          this.morrisView?.setHighlightedPoints([]);
          this.updateHUD();
          this.updateBoard();
          return;
        }

        // Select own piece
        this.selectedMorrisPoint = pt;
        const legalDests = this.getMorrisLegalDestinations(pt, phase);
        if (legalDests.length === 0) {
          this.hudView.updateStatus('This piece is blocked. Select another piece to slide.');
        } else {
          this.hudView.updateStatus('Piece selected. Tap an adjacent highlighted point to slide.');
        }
        this.morrisView?.setSelectedPoint(pt);
        this.morrisView?.setHighlightedPoints(legalDests);
        this.updateBoard();
        return;
      }

      if (this.selectedMorrisPoint !== null && this.morrisState.board[pt] === MORRIS_EMPTY) {
        const legalDests = this.getMorrisLegalDestinations(this.selectedMorrisPoint, phase);
        if (!legalDests.includes(pt)) return;

        const moveType = phase === 'flying' ? 'fly' : 'slide';
        const isMill = formsMillOnMove(this.morrisState.board, this.selectedMorrisPoint, pt, this.humanPlayer);

        if (isMill) {
          const nextBoard = [...this.morrisState.board];
          nextBoard[this.selectedMorrisPoint] = MORRIS_EMPTY;
          nextBoard[pt] = this.humanPlayer;
          const validCaptures = getValidCaptureTargets(nextBoard, getMorrisOpponent(this.humanPlayer));

          if (validCaptures.length > 0) {
            this.stateBeforeCapture = cloneMorrisState(this.morrisState);
            this.pendingCaptureBaseMove = { type: moveType, from: this.selectedMorrisPoint, to: pt };
            this.morrisState.pendingCapture = true;

            const interimState = cloneMorrisState(this.morrisState);
            interimState.board[this.selectedMorrisPoint] = MORRIS_EMPTY;
            interimState.board[pt] = this.humanPlayer;
            interimState.pendingCapture = true;

            this.morrisView?.setRecentMove(this.selectedMorrisPoint, pt);
            this.morrisView?.setCaptureTargets(validCaptures);
            this.morrisView?.setSelectedPoint(null);
            this.morrisView?.setHighlightedPoints([]);
            this.morrisView?.render(interimState);
            this.selectedMorrisPoint = null;
            this.updateHUD();
            return;
          }
        }

        const fromPt = this.selectedMorrisPoint;
        this.morrisUndoStack.push(cloneMorrisState(this.morrisState));
        this.morrisState = applyMorrisMove(this.morrisState, {
          type: moveType,
          from: fromPt,
          to: pt,
        });

        this.selectedMorrisPoint = null;
        this.morrisView?.clearVisualFeedback();
        this.morrisView?.setRecentMove(fromPt, pt);
        this.updateHUD();
        this.updateBoard();

        if (this.morrisState.winner === null && this.morrisState.turn !== this.humanPlayer) {
          await this.triggerMorrisEngineMove();
        }
      }
    }
  }

  private getMorrisLegalDestinations(from: PointId, phase: 'movement' | 'flying'): PointId[] {
    if (phase === 'flying') {
      const dests: PointId[] = [];
      for (let i = 0; i < 24; i++) {
        if (this.morrisState.board[i as PointId] === MORRIS_EMPTY) dests.push(i as PointId);
      }
      return dests;
    }
    return MORRIS_ADJACENCY_LIST[from].filter((adj) => this.morrisState.board[adj] === MORRIS_EMPTY);
  }

  private async triggerMorrisEngineMove(): Promise<void> {
    this.isEngineThinking = true;
    this.hudView.updateStatus(`Engine thinking (Level ${this.currentDifficulty})...`);

    const config = DIFFICULTY_CONFIGS[this.currentDifficulty];

    try {
      const searchPromise = this.engineClient.search<MorrisState, MorrisMove>(
        'nine-mens-morris',
        this.morrisState,
        config
      );
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 350));
      const [result] = await Promise.all([searchPromise, delayPromise]);

      await this.executeMorrisEngineMove(result.bestMove);
    } catch (err) {
      console.error('Morris engine search error:', err);
    } finally {
      this.isEngineThinking = false;
      this.updateHUD();
    }
  }

  private async executeMorrisEngineMove(move: MorrisMove): Promise<void> {
    const opp = getMorrisOpponent(this.humanPlayer);

    if (move.capture !== undefined) {
      const interimState = cloneMorrisState(this.morrisState);
      if (move.type === 'place') {
        interimState.board[move.to] = opp;
        if (opp === 1) interimState.whitePiecesInHand--;
        else interimState.blackPiecesInHand--;
      } else if (move.from !== undefined) {
        interimState.board[move.from] = MORRIS_EMPTY;
        interimState.board[move.to] = opp;
      }

      this.morrisView?.setRecentMove(move.from, move.to);
      this.morrisView?.setStagedCaptureTarget(move.capture);
      this.morrisView?.render(interimState);
      this.hudView.updateStatus(`Engine closed a mill and captures piece at point ${move.capture}!`);

      await new Promise((resolve) => setTimeout(resolve, 550));
    }

    this.morrisView?.setRecentMove(move.from, move.to);
    if (move.capture !== undefined) {
      this.morrisView?.setLastCaptured(move.capture);
    }

    this.morrisState = applyMorrisMove(this.morrisState, move);
    this.updateHUD();
    this.updateBoard();
  }

  // ==========================================
  // Universal Undo & Modals
  // ==========================================
  private handleUndo(): void {
    if (this.isEngineThinking) return;

    if (this.gameMeta.id === 'nine-mens-morris') {
      if (this.morrisState.pendingCapture && this.stateBeforeCapture) {
        this.morrisState = this.stateBeforeCapture;
        this.selectedMorrisPoint = null;
        this.pendingCaptureBaseMove = null;
        this.stateBeforeCapture = null;
        this.morrisView?.clearVisualFeedback();
        this.modalContainer.classList.add('hidden');
        this.updateHUD();
        this.updateBoard();
        return;
      }

      if (this.morrisUndoStack.length === 0) return;

      this.morrisState = this.morrisUndoStack.pop()!;
      this.selectedMorrisPoint = null;
      this.pendingCaptureBaseMove = null;
      this.stateBeforeCapture = null;
      this.morrisView?.clearVisualFeedback();
      this.modalContainer.classList.add('hidden');
      this.updateHUD();
      this.updateBoard();
    } else if (this.gameMeta.id === 'checkers') {
      if (this.checkersUndoStack.length === 0) return;

      this.checkersState = this.checkersUndoStack.pop()!;
      this.selectedCheckersSquare = null;
      this.checkersView?.clearVisualFeedback();
      this.modalContainer.classList.add('hidden');
      this.updateHUD();
      this.updateBoard();
    }
  }

  private showGameOverModal(): void {
    const modalTitle = this.modalContainer.querySelector('#modal-title')!;
    const modalDesc = this.modalContainer.querySelector('#modal-desc')!;

    if (this.gameMeta.id === 'nine-mens-morris') {
      if (this.morrisState.winner === 'draw') {
        modalTitle.textContent = 'Game Draw!';
        modalDesc.textContent =
          this.morrisState.winReason === 'repetition'
            ? 'Draw by Threefold Repetition.'
            : 'Draw by 50-Move Rule (no captures).';
      } else if (this.morrisState.winner === this.humanPlayer) {
        modalTitle.textContent = 'Victory!';
        modalDesc.textContent = `Congratulations! You won by ${
          this.morrisState.winReason === 'trapped'
            ? 'trapping all opponent pieces'
            : 'reducing opponent below 3 pieces'
        }.`;
      } else {
        modalTitle.textContent = 'Defeat';
        modalDesc.textContent = `The engine (${getMorrisColorName(
          getMorrisOpponent(this.humanPlayer)
        )}) won this match.`;
      }
    } else if (this.gameMeta.id === 'checkers') {
      if (this.checkersState.winner === 'draw') {
        modalTitle.textContent = 'Game Draw!';
        modalDesc.textContent =
          this.checkersState.winReason === 'repetition'
            ? 'Draw by Threefold Repetition.'
            : 'Draw by 40-Move Rule (80 plies without capture/man advance).';
      } else if (this.checkersState.winner === this.humanPlayer) {
        modalTitle.textContent = 'Victory!';
        modalDesc.textContent = `Congratulations! You won by ${
          this.checkersState.winReason === 'trapped'
            ? 'trapping all opponent pieces'
            : 'capturing all opponent pieces'
        }.`;
      } else {
        modalTitle.textContent = 'Defeat';
        modalDesc.textContent = `The engine (${getCheckersColorName(
          getCheckersOpponent(this.humanPlayer)
        )}) won this match.`;
      }
    }

    this.modalContainer.classList.remove('hidden');
  }
}
