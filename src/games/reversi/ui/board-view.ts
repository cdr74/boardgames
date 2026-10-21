import { BOARD_SIZE, STAR_DOTS, TOTAL_SQUARES } from '../constants';
import { coordFromIndex } from '../board';
import { getLegalMoves } from '../rules';
import { ReversiMove, ReversiState, SquareIndex } from '../types';

export interface ReversiBoardViewCallbacks {
  onSquareClick: (square: SquareIndex) => void;
}

export class ReversiBoardView {
  private container: HTMLElement;
  private svg: SVGSVGElement;
  private callbacks: ReversiBoardViewCallbacks;
  private recentMove: ReversiMove | null = null;
  private highlightedMoves: Set<SquareIndex> = new Set();

  constructor(container: HTMLElement, callbacks: ReversiBoardViewCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.initSvg();
  }

  private initSvg(): void {
    this.svg.setAttribute('viewBox', '0 0 640 640');
    this.svg.setAttribute('class', 'game-board-svg reversi-board-svg');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', 'Reversi Game Board');
    this.container.appendChild(this.svg);
  }

  public setRecentMove(move: ReversiMove | null): void {
    this.recentMove = move;
  }

  public setHighlightedMoves(moves: SquareIndex[]): void {
    this.highlightedMoves = new Set(moves);
  }

  public clearVisualFeedback(): void {
    this.recentMove = null;
    this.highlightedMoves.clear();
  }

  public render(state: ReversiState): void {
    // Clear svg content
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <radialGradient id="reversi-grad-black" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#475569"/>
        <stop offset="40%" stop-color="#334155"/>
        <stop offset="80%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
      <radialGradient id="reversi-grad-white" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="70%" stop-color="#e2e8f0"/>
        <stop offset="100%" stop-color="#94a3b8"/>
      </radialGradient>
      <filter id="reversi-piece-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity="0.45"/>
      </filter>
    `;
    this.svg.appendChild(defs);

    // 1. Forest Green Felt Board Base
    const feltBase = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    feltBase.setAttribute('x', '0');
    feltBase.setAttribute('y', '0');
    feltBase.setAttribute('width', '640');
    feltBase.setAttribute('height', '640');
    feltBase.setAttribute('rx', '14');
    feltBase.setAttribute('fill', '#15803d'); // Deep vibrant green felt
    feltBase.setAttribute('stroke', '#14532d');
    feltBase.setAttribute('stroke-width', '4');
    feltBase.setAttribute('pointer-events', 'none');
    this.svg.appendChild(feltBase);

    // 2. 64 Grid Square Outlines
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('class', 'reversi-grid-lines');
    gridGroup.setAttribute('pointer-events', 'none');
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const sq = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        sq.setAttribute('x', String(c * 80));
        sq.setAttribute('y', String(r * 80));
        sq.setAttribute('width', '80');
        sq.setAttribute('height', '80');
        sq.setAttribute('fill', 'none');
        sq.setAttribute('stroke', '#166534');
        sq.setAttribute('stroke-width', '1.5');
        gridGroup.appendChild(sq);
      }
    }
    this.svg.appendChild(gridGroup);

    // 3. Four Classic Othello Star Intersection Dots
    const starDotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    starDotsGroup.setAttribute('class', 'reversi-star-dots');
    starDotsGroup.setAttribute('pointer-events', 'none');
    for (const dot of STAR_DOTS) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(dot.col * 80));
      circle.setAttribute('cy', String(dot.row * 80));
      circle.setAttribute('r', '4.5');
      circle.setAttribute('fill', '#0f3d2e');
      starDotsGroup.appendChild(circle);
    }
    this.svg.appendChild(starDotsGroup);

    // 4. Played Discs Layer
    const discsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    discsGroup.setAttribute('class', 'reversi-discs-layer');
    for (let i = 0; i < TOTAL_SQUARES; i++) {
      const val = state.board[i];
      if (val === 0) continue;

      const { col, row } = coordFromIndex(i);
      const cx = col * 80 + 40;
      const cy = row * 80 + 40;

      const discG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      discG.setAttribute(
        'class',
        `reversi-disc ${val === 1 ? 'disc-black' : 'disc-white'}`
      );
      discG.setAttribute('data-square-index', String(i));
      discG.setAttribute('pointer-events', 'none');

      // Outer piece disc
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(cx));
      circle.setAttribute('cy', String(cy));
      circle.setAttribute('r', '32');
      circle.setAttribute('filter', 'url(#reversi-piece-shadow)');

      if (val === 1) {
        circle.setAttribute('fill', 'url(#reversi-grad-black)');
        circle.setAttribute('stroke', '#cbd5e1'); // High contrast crisp silver rim
        circle.setAttribute('stroke-width', '2.5');
      } else {
        circle.setAttribute('fill', 'url(#reversi-grad-white)');
        circle.setAttribute('stroke', '#cbd5e1');
        circle.setAttribute('stroke-width', '2');
      }
      discG.appendChild(circle);

      // Tactile inner concentric ridge 1
      const ridge1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ridge1.setAttribute('cx', String(cx));
      ridge1.setAttribute('cy', String(cy));
      ridge1.setAttribute('r', '21');
      ridge1.setAttribute('fill', 'none');
      ridge1.setAttribute('stroke', val === 1 ? '#94a3b8' : '#e2e8f0');
      ridge1.setAttribute('stroke-width', '1.5');
      discG.appendChild(ridge1);

      // Tactile inner concentric ridge 2
      const ridge2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ridge2.setAttribute('cx', String(cx));
      ridge2.setAttribute('cy', String(cy));
      ridge2.setAttribute('r', '11');
      ridge2.setAttribute('fill', 'none');
      ridge2.setAttribute('stroke', val === 1 ? '#64748b' : '#cbd5e1');
      ridge2.setAttribute('stroke-width', '1.2');
      discG.appendChild(ridge2);

      discsGroup.appendChild(discG);
    }
    this.svg.appendChild(discsGroup);

    // 5. Recent Move & Flips Highlights
    if (this.recentMove) {
      const { col, row } = coordFromIndex(this.recentMove.square);
      const cx = col * 80 + 40;
      const cy = row * 80 + 40;

      const recentRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      recentRing.setAttribute('cx', String(cx));
      recentRing.setAttribute('cy', String(cy));
      recentRing.setAttribute('r', '36');
      recentRing.setAttribute('fill', 'none');
      recentRing.setAttribute('stroke', '#38bdf8');
      recentRing.setAttribute('stroke-width', '3');
      recentRing.setAttribute('stroke-dasharray', '5 3');
      recentRing.setAttribute('class', 'recent-move-to pulse');
      recentRing.setAttribute('pointer-events', 'none');
      this.svg.appendChild(recentRing);
    }

    // 6. Legal Move Destination Indicators (Dots)
    const legalMoves = getLegalMoves(state);
    const legalSquareSet = new Set(legalMoves.map((m) => m.square));

    const dotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dotsGroup.setAttribute('class', 'reversi-legal-dots');
    dotsGroup.setAttribute('pointer-events', 'none');
    for (const sq of legalSquareSet) {
      const { col, row } = coordFromIndex(sq);
      const cx = col * 80 + 40;
      const cy = row * 80 + 40;

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', String(cx));
      dot.setAttribute('cy', String(cy));
      dot.setAttribute('r', '10');
      dot.setAttribute('fill', 'rgba(255, 255, 255, 0.28)');
      dot.setAttribute('stroke', 'rgba(255, 255, 255, 0.65)');
      dot.setAttribute('stroke-width', '1.5');
      dot.setAttribute('class', 'reversi-dest-dot pulse');
      dotsGroup.appendChild(dot);
    }
    this.svg.appendChild(dotsGroup);

    // 7. Interactive Square Hitboxes (64 squares)
    const interactiveGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    interactiveGroup.setAttribute('class', 'reversi-interactive-layer');

    for (let sq = 0; sq < TOTAL_SQUARES; sq++) {
      const { col, row } = coordFromIndex(sq);
      const isLegal = legalSquareSet.has(sq);
      const isGameOver = state.winner !== null;

      const sqG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      sqG.setAttribute('class', `reversi-square-interactive ${isLegal ? 'square-legal' : ''}`);
      sqG.setAttribute('data-square-index', String(sq));
      sqG.setAttribute('role', 'button');
      sqG.setAttribute('aria-label', `Square ${String.fromCharCode(97 + col)}${row + 1}${isLegal ? ' (Legal Move)' : ''}`);
      sqG.setAttribute('tabindex', isLegal && !isGameOver ? '0' : '-1');

      // 80x80 touch target (far exceeds 48px minimum touch standard)
      const hitRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hitRect.setAttribute('x', String(col * 80));
      hitRect.setAttribute('y', String(row * 80));
      hitRect.setAttribute('width', '80');
      hitRect.setAttribute('height', '80');
      hitRect.setAttribute('fill', 'transparent');
      hitRect.style.cursor = isLegal && !isGameOver ? 'pointer' : 'default';
      sqG.appendChild(hitRect);

      if (isLegal && !isGameOver) {
        sqG.addEventListener('click', (e) => {
          e.preventDefault();
          this.callbacks.onSquareClick(sq);
        });

        sqG.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.callbacks.onSquareClick(sq);
          }
        });
      }

      interactiveGroup.appendChild(sqG);
    }
    this.svg.appendChild(interactiveGroup);
  }
}
