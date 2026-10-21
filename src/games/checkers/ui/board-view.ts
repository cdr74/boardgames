import { isBlack, isKing } from '../board';
import { coordFromIndex, SQUARE_COORDS } from '../constants';
import { CheckersState, EMPTY, SquareIndex } from '../types';

export interface CheckersBoardViewCallbacks {
  onSquareClick: (squareIndex: SquareIndex) => void;
}

export class CheckersBoardView {
  private container: HTMLElement;
  private svg: SVGSVGElement;
  private callbacks: CheckersBoardViewCallbacks;

  private selectedSquare: SquareIndex | null = null;
  private highlightedDests: Set<SquareIndex> = new Set();
  private recentMoveFrom: SquareIndex | null = null;
  private recentMoveTo: SquareIndex | null = null;
  private recentTrajectory: SquareIndex[] = [];
  private lastCapturedSquares: Set<SquareIndex> = new Set();

  constructor(container: HTMLElement, callbacks: CheckersBoardViewCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.initSvg();
  }

  private initSvg(): void {
    this.svg.setAttribute('viewBox', '0 0 640 640');
    this.svg.setAttribute('class', 'game-board-svg checkers-board-svg');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', 'English Checkers Game Board');
    this.container.appendChild(this.svg);
  }

  public setSelectedSquare(sq: SquareIndex | null): void {
    this.selectedSquare = sq;
  }

  public setHighlightedDestinations(squares: SquareIndex[]): void {
    this.highlightedDests = new Set(squares);
  }

  public setRecentMove(from?: SquareIndex, to?: SquareIndex, path?: SquareIndex[]): void {
    this.recentMoveFrom = from ?? null;
    this.recentMoveTo = to ?? null;
    this.recentTrajectory = path ?? [];
  }

  public setLastCaptured(squares: SquareIndex[]): void {
    this.lastCapturedSquares = new Set(squares);
  }

  public clearVisualFeedback(): void {
    this.selectedSquare = null;
    this.highlightedDests.clear();
    this.recentMoveFrom = null;
    this.recentMoveTo = null;
    this.recentTrajectory = [];
    this.lastCapturedSquares.clear();
  }

  public render(state: CheckersState): void {
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <radialGradient id="grad-white-piece" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="70%" stop-color="#e2e8f0"/>
        <stop offset="100%" stop-color="#94a3b8"/>
      </radialGradient>
      <radialGradient id="grad-black-piece" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#475569"/>
        <stop offset="70%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </radialGradient>
      <filter id="piece-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.4"/>
      </filter>
    `;
    this.svg.appendChild(defs);

    // Board Background Plate
    const bgPlate = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgPlate.setAttribute('class', 'board-background');
    bgPlate.setAttribute('x', '0');
    bgPlate.setAttribute('y', '0');
    bgPlate.setAttribute('width', '640');
    bgPlate.setAttribute('height', '640');
    bgPlate.setAttribute('rx', '12');
    bgPlate.setAttribute('ry', '12');
    bgPlate.setAttribute('fill', '#0f172a');
    bgPlate.setAttribute('stroke', '#334155');
    bgPlate.setAttribute('stroke-width', '2');
    this.svg.appendChild(bgPlate);

    const squaresGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    squaresGroup.setAttribute('class', 'board-squares');
    this.svg.appendChild(squaresGroup);

    // Render 64 Squares (8x8 grid)
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = c * 80;
        const y = r * 80;
        const isPlayableDark = (r + c) % 2 === 1;

        const sqRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        sqRect.setAttribute('x', String(x));
        sqRect.setAttribute('y', String(y));
        sqRect.setAttribute('width', '80');
        sqRect.setAttribute('height', '80');

        if (!isPlayableDark) {
          sqRect.setAttribute('class', 'checker-square light-square');
          sqRect.setAttribute('fill', '#334155');
          squaresGroup.appendChild(sqRect);
        } else {
          sqRect.setAttribute('class', 'checker-square dark-square');
          sqRect.setAttribute('fill', '#1e293b');
          sqRect.setAttribute('stroke', '#0f172a');
          sqRect.setAttribute('stroke-width', '1');
          squaresGroup.appendChild(sqRect);
        }
      }
    }

    // Trajectory Polyline for Multi-jump (if applicable)
    if (this.recentTrajectory.length >= 2) {
      const pointsStr = this.recentTrajectory
        .map((sqIndex) => {
          const coord = coordFromIndex(sqIndex);
          const cx = coord.col * 80 + 40;
          const cy = coord.row * 80 + 40;
          return `${cx},${cy}`;
        })
        .join(' ');

      const trajPolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      trajPolyline.setAttribute('points', pointsStr);
      trajPolyline.setAttribute('class', 'move-trajectory-line');
      trajPolyline.setAttribute('fill', 'none');
      trajPolyline.setAttribute('stroke', '#38bdf8');
      trajPolyline.setAttribute('stroke-width', '3');
      trajPolyline.setAttribute('stroke-dasharray', '6 4');
      trajPolyline.setAttribute('stroke-linecap', 'round');
      trajPolyline.setAttribute('pointer-events', 'none');
      this.svg.appendChild(trajPolyline);
    }

    // Render 32 Dark Interactive Squares, Pieces, and Markers
    const interactiveGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    interactiveGroup.setAttribute('class', 'board-interactive-layer');
    this.svg.appendChild(interactiveGroup);

    for (let i = 0; i < 32; i++) {
      const coord = SQUARE_COORDS[i];
      const cx = coord.col * 80 + 40;
      const cy = coord.row * 80 + 40;
      const piece = state.board[i];

      const squareG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      squareG.setAttribute('class', 'board-square-interactive');
      squareG.setAttribute('data-square-index', String(i));
      squareG.setAttribute('role', 'button');
      squareG.setAttribute('tabindex', '0');
      squareG.setAttribute('aria-label', `Square ${i + 1} at row ${coord.row + 1}, col ${coord.col + 1}`);

      // Touch Target (80x80px bounding area)
      const touchArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      touchArea.setAttribute('x', String(coord.col * 80));
      touchArea.setAttribute('y', String(coord.row * 80));
      touchArea.setAttribute('width', '80');
      touchArea.setAttribute('height', '80');
      touchArea.setAttribute('fill', 'transparent');
      touchArea.setAttribute('cursor', 'pointer');
      squareG.appendChild(touchArea);

      // Recent Move Indicators
      if (this.recentMoveFrom === i) {
        const fromRing = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        fromRing.setAttribute('x', String(coord.col * 80 + 4));
        fromRing.setAttribute('y', String(coord.row * 80 + 4));
        fromRing.setAttribute('width', '72');
        fromRing.setAttribute('height', '72');
        fromRing.setAttribute('class', 'recent-move-from');
        fromRing.setAttribute('fill', 'none');
        fromRing.setAttribute('stroke', '#94a3b8');
        fromRing.setAttribute('stroke-width', '2');
        fromRing.setAttribute('stroke-dasharray', '4 3');
        fromRing.setAttribute('pointer-events', 'none');
        squareG.appendChild(fromRing);
      }

      if (this.recentMoveTo === i) {
        const toRing = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        toRing.setAttribute('x', String(coord.col * 80 + 4));
        toRing.setAttribute('y', String(coord.row * 80 + 4));
        toRing.setAttribute('width', '72');
        toRing.setAttribute('height', '72');
        toRing.setAttribute('class', 'recent-move-to');
        toRing.setAttribute('fill', 'none');
        toRing.setAttribute('stroke', '#38bdf8');
        toRing.setAttribute('stroke-width', '2.5');
        toRing.setAttribute('pointer-events', 'none');
        squareG.appendChild(toRing);
      }

      // Last Captured Cross Indicator
      if (this.lastCapturedSquares.has(i)) {
        const capRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        capRing.setAttribute('cx', String(cx));
        capRing.setAttribute('cy', String(cy));
        capRing.setAttribute('r', '24');
        capRing.setAttribute('class', 'last-captured-ring');
        capRing.setAttribute('fill', 'rgba(239, 68, 68, 0.2)');
        capRing.setAttribute('stroke', '#ef4444');
        capRing.setAttribute('stroke-width', '1.5');
        capRing.setAttribute('pointer-events', 'none');
        squareG.appendChild(capRing);

        const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l1.setAttribute('x1', String(cx - 12));
        l1.setAttribute('y1', String(cy - 12));
        l1.setAttribute('x2', String(cx + 12));
        l1.setAttribute('y2', String(cy + 12));
        l1.setAttribute('class', 'last-captured-cross');
        l1.setAttribute('stroke', '#ef4444');
        l1.setAttribute('stroke-width', '2');
        l1.setAttribute('stroke-linecap', 'round');
        l1.setAttribute('pointer-events', 'none');
        squareG.appendChild(l1);

        const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l2.setAttribute('x1', String(cx + 12));
        l2.setAttribute('y1', String(cy - 12));
        l2.setAttribute('x2', String(cx - 12));
        l2.setAttribute('y2', String(cy + 12));
        l2.setAttribute('class', 'last-captured-cross');
        l2.setAttribute('stroke', '#ef4444');
        l2.setAttribute('stroke-width', '2');
        l2.setAttribute('stroke-linecap', 'round');
        l2.setAttribute('pointer-events', 'none');
        squareG.appendChild(l2);
      }

      // Legal Destination Highlight Dot & Ring
      if (this.highlightedDests.has(i)) {
        const destRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        destRing.setAttribute('cx', String(cx));
        destRing.setAttribute('cy', String(cy));
        destRing.setAttribute('r', '14');
        destRing.setAttribute('class', 'dest-highlight pulse');
        destRing.setAttribute('fill', 'rgba(16, 185, 129, 0.45)');
        destRing.setAttribute('stroke', '#10b981');
        destRing.setAttribute('stroke-width', '3');
        destRing.setAttribute('pointer-events', 'none');
        squareG.appendChild(destRing);
      }

      // Selection Halo around active piece
      if (this.selectedSquare === i) {
        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        halo.setAttribute('cx', String(cx));
        halo.setAttribute('cy', String(cy));
        halo.setAttribute('r', '34');
        halo.setAttribute('class', 'selection-halo');
        halo.setAttribute('fill', 'none');
        halo.setAttribute('stroke', '#38bdf8');
        halo.setAttribute('stroke-width', '3');
        halo.setAttribute('stroke-dasharray', '5 3');
        halo.setAttribute('pointer-events', 'none');
        squareG.appendChild(halo);
      }

      // Checkers Piece Representation
      if (piece !== EMPTY) {
        const pieceG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        pieceG.setAttribute('class', `checkers-piece ${isBlack(piece) ? 'piece-black' : 'piece-white'}`);
        pieceG.setAttribute('pointer-events', 'none');

        // Outer piece disc
        const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outerCircle.setAttribute('cx', String(cx));
        outerCircle.setAttribute('cy', String(cy));
        outerCircle.setAttribute('r', '28');
        outerCircle.setAttribute('filter', 'url(#piece-shadow)');

        if (isBlack(piece)) {
          outerCircle.setAttribute('fill', 'url(#grad-black-piece)');
          outerCircle.setAttribute('stroke', '#0f172a');
          outerCircle.setAttribute('stroke-width', '2');
        } else {
          outerCircle.setAttribute('fill', 'url(#grad-white-piece)');
          outerCircle.setAttribute('stroke', '#cbd5e1');
          outerCircle.setAttribute('stroke-width', '2');
        }
        pieceG.appendChild(outerCircle);

        // Inner ridge 1
        const ridge1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ridge1.setAttribute('cx', String(cx));
        ridge1.setAttribute('cy', String(cy));
        ridge1.setAttribute('r', '20');
        ridge1.setAttribute('fill', 'none');
        ridge1.setAttribute('stroke', isBlack(piece) ? '#475569' : '#cbd5e1');
        ridge1.setAttribute('stroke-width', '1.5');
        pieceG.appendChild(ridge1);

        // Inner ridge 2
        const ridge2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ridge2.setAttribute('cx', String(cx));
        ridge2.setAttribute('cy', String(cy));
        ridge2.setAttribute('r', '12');
        ridge2.setAttribute('fill', 'none');
        ridge2.setAttribute('stroke', isBlack(piece) ? '#334155' : '#e2e8f0');
        ridge2.setAttribute('stroke-width', '1');
        pieceG.appendChild(ridge2);

        // King Crown Icon
        if (isKing(piece)) {
          const crown = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          const p1 = `${cx - 13},${cy + 8}`;
          const p2 = `${cx - 13},${cy - 5}`;
          const p3 = `${cx - 7},${cy + 2}`;
          const p4 = `${cx},${cy - 10}`;
          const p5 = `${cx + 7},${cy + 2}`;
          const p6 = `${cx + 13},${cy - 5}`;
          const p7 = `${cx + 13},${cy + 8}`;
          crown.setAttribute('points', `${p1} ${p2} ${p3} ${p4} ${p5} ${p6} ${p7}`);
          crown.setAttribute('class', 'king-crown');
          crown.setAttribute('fill', '#fbbf24');
          crown.setAttribute('stroke', '#b45309');
          crown.setAttribute('stroke-width', '1.5');
          crown.setAttribute('stroke-linejoin', 'round');
          pieceG.appendChild(crown);

          // Crown tip gems
          const gemCoords = [
            { x: cx - 13, y: cy - 5 },
            { x: cx, y: cy - 10 },
            { x: cx + 13, y: cy - 5 },
          ];
          for (const gem of gemCoords) {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', String(gem.x));
            dot.setAttribute('cy', String(gem.y));
            dot.setAttribute('r', '1.5');
            dot.setAttribute('fill', '#fef08a');
            pieceG.appendChild(dot);
          }
        }

        squareG.appendChild(pieceG);
      }

      // Click & Keyboard Event Listeners
      squareG.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onSquareClick(i);
      });

      squareG.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.callbacks.onSquareClick(i);
        }
      });

      interactiveGroup.appendChild(squareG);
    }
  }
}
