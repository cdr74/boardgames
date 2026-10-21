import { POINT_COORDINATES } from '../constants';
import { EMPTY, GameState, PointId } from '../types';

export interface BoardViewCallbacks {
  onPointClick: (pointId: PointId) => void;
}

export class BoardView {
  private container: HTMLElement;
  private svg: SVGSVGElement;
  private callbacks: BoardViewCallbacks;
  private selectedPoint: PointId | null = null;
  private highlightedPoints: Set<PointId> = new Set();
  private captureTargets: Set<PointId> = new Set();
  private recentMoveFrom: PointId | null = null;
  private recentMoveTo: PointId | null = null;
  private stagedCaptureTarget: PointId | null = null;
  private lastCapturedPoint: PointId | null = null;

  constructor(container: HTMLElement, callbacks: BoardViewCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.initSvg();
  }

  private initSvg(): void {
    this.svg.setAttribute('viewBox', '0 0 600 600');
    this.svg.setAttribute('class', 'game-board-svg');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', "Nine Men's Morris Game Board");
    this.container.appendChild(this.svg);
  }

  public setSelectedPoint(point: PointId | null): void {
    this.selectedPoint = point;
  }

  public setHighlightedPoints(points: PointId[]): void {
    this.highlightedPoints = new Set(points);
  }

  public setCaptureTargets(points: PointId[]): void {
    this.captureTargets = new Set(points);
  }

  public setRecentMove(from?: PointId, to?: PointId): void {
    this.recentMoveFrom = from ?? null;
    this.recentMoveTo = to ?? null;
  }

  public setStagedCaptureTarget(point: PointId | null): void {
    this.stagedCaptureTarget = point;
  }

  public setLastCaptured(point: PointId | null): void {
    this.lastCapturedPoint = point;
  }

  public clearVisualFeedback(): void {
    this.selectedPoint = null;
    this.highlightedPoints.clear();
    this.captureTargets.clear();
    this.stagedCaptureTarget = null;
    this.recentMoveFrom = null;
    this.recentMoveTo = null;
    this.lastCapturedPoint = null;
  }

  public render(state: GameState): void {
    // Clear svg content
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
        <stop offset="40%" stop-color="#334155"/>
        <stop offset="80%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
      <filter id="piece-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.35"/>
      </filter>
      <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    `;
    this.svg.appendChild(defs);

    // Board Background Plate
    const bgPlate = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgPlate.setAttribute('class', 'board-background');
    bgPlate.setAttribute('x', '10');
    bgPlate.setAttribute('y', '10');
    bgPlate.setAttribute('width', '580');
    bgPlate.setAttribute('height', '580');
    bgPlate.setAttribute('rx', '16');
    bgPlate.setAttribute('ry', '16');
    bgPlate.setAttribute('fill', '#1e293b');
    bgPlate.setAttribute('stroke', '#334155');
    bgPlate.setAttribute('stroke-width', '2');
    bgPlate.setAttribute('pointer-events', 'none');
    this.svg.appendChild(bgPlate);

    // 1. Draw Board Background Grid Lines
    this.drawBoardLines();

    // 2. Draw Move Trajectory Line if piece slid or flew
    if (this.recentMoveFrom !== null && this.recentMoveTo !== null) {
      const fromCoord = POINT_COORDINATES[this.recentMoveFrom];
      const toCoord = POINT_COORDINATES[this.recentMoveTo];
      const trajLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      trajLine.setAttribute('x1', String(fromCoord.x));
      trajLine.setAttribute('y1', String(fromCoord.y));
      trajLine.setAttribute('x2', String(toCoord.x));
      trajLine.setAttribute('y2', String(toCoord.y));
      trajLine.setAttribute('stroke', '#38bdf8');
      trajLine.setAttribute('stroke-width', '3');
      trajLine.setAttribute('stroke-dasharray', '6 4');
      trajLine.setAttribute('stroke-linecap', 'round');
      trajLine.setAttribute('opacity', '0.75');
      trajLine.setAttribute('class', 'move-trajectory-line');
      trajLine.setAttribute('pointer-events', 'none');
      this.svg.appendChild(trajLine);
    }

    // 3. Draw 24 Vertices, Markers, and Pieces
    for (let i = 0; i < 24; i++) {
      const pt = i as PointId;
      const coord = POINT_COORDINATES[pt];
      const piece = state.board[pt];
      const isSelected = this.selectedPoint === pt;
      const isLegalMove = this.highlightedPoints.has(pt);
      const isCaptureTarget = this.captureTargets.has(pt);
      const isRecentFrom = this.recentMoveFrom === pt;
      const isRecentTo = this.recentMoveTo === pt;
      const isStagedCapture = this.stagedCaptureTarget === pt;
      const isLastCaptured = this.lastCapturedPoint === pt && piece === EMPTY;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'board-point');
      g.setAttribute('data-point-id', String(pt));
      g.style.cursor = 'pointer';

      // Invisible touch target (diameter 52px for mobile touch)
      const touchCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      touchCircle.setAttribute('cx', String(coord.x));
      touchCircle.setAttribute('cy', String(coord.y));
      touchCircle.setAttribute('r', '26');
      touchCircle.setAttribute('fill', 'transparent');
      g.appendChild(touchCircle);

      // Base point intersection dot
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', String(coord.x));
      dot.setAttribute('cy', String(coord.y));
      dot.setAttribute('r', '7');
      dot.setAttribute('fill', '#334155');
      dot.setAttribute('stroke', '#64748b');
      dot.setAttribute('stroke-width', '2');
      dot.setAttribute('class', 'point-dot');
      g.appendChild(dot);

      // Highlight for legal move destination
      if (isLegalMove) {
        const destHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        destHighlight.setAttribute('cx', String(coord.x));
        destHighlight.setAttribute('cy', String(coord.y));
        destHighlight.setAttribute('r', '14');
        destHighlight.setAttribute('fill', 'rgba(16, 185, 129, 0.35)');
        destHighlight.setAttribute('stroke', '#10b981');
        destHighlight.setAttribute('stroke-width', '2.5');
        destHighlight.setAttribute('class', 'dest-highlight pulse');
        g.appendChild(destHighlight);
      }

      // Recent move source marker (where piece moved from)
      if (isRecentFrom) {
        const fromRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        fromRing.setAttribute('cx', String(coord.x));
        fromRing.setAttribute('cy', String(coord.y));
        fromRing.setAttribute('r', '22');
        fromRing.setAttribute('fill', 'none');
        fromRing.setAttribute('stroke', '#94a3b8');
        fromRing.setAttribute('stroke-width', '2');
        fromRing.setAttribute('stroke-dasharray', '4 3');
        fromRing.setAttribute('opacity', '0.75');
        fromRing.setAttribute('class', 'recent-move-from');
        g.appendChild(fromRing);
      }

      // Last captured ghost marker on empty point
      if (isLastCaptured) {
        const capturedRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        capturedRing.setAttribute('cx', String(coord.x));
        capturedRing.setAttribute('cy', String(coord.y));
        capturedRing.setAttribute('r', '18');
        capturedRing.setAttribute('fill', 'none');
        capturedRing.setAttribute('stroke', '#ef4444');
        capturedRing.setAttribute('stroke-width', '1.5');
        capturedRing.setAttribute('opacity', '0.6');
        capturedRing.setAttribute('class', 'last-captured-ring');
        g.appendChild(capturedRing);

        const cross1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cross1.setAttribute('x1', String(coord.x - 7));
        cross1.setAttribute('y1', String(coord.y - 7));
        cross1.setAttribute('x2', String(coord.x + 7));
        cross1.setAttribute('y2', String(coord.y + 7));
        cross1.setAttribute('stroke', '#ef4444');
        cross1.setAttribute('stroke-width', '2');
        cross1.setAttribute('stroke-linecap', 'round');
        cross1.setAttribute('class', 'last-captured-cross');
        g.appendChild(cross1);

        const cross2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cross2.setAttribute('x1', String(coord.x - 7));
        cross2.setAttribute('y1', String(coord.y + 7));
        cross2.setAttribute('x2', String(coord.x + 7));
        cross2.setAttribute('y2', String(coord.y - 7));
        cross2.setAttribute('stroke', '#ef4444');
        cross2.setAttribute('stroke-width', '2');
        cross2.setAttribute('stroke-linecap', 'round');
        cross2.setAttribute('class', 'last-captured-cross');
        g.appendChild(cross2);
      }

      // Piece rendering
      if (piece !== EMPTY) {
        // Selection Halo
        if (isSelected) {
          const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          halo.setAttribute('cx', String(coord.x));
          halo.setAttribute('cy', String(coord.y));
          halo.setAttribute('r', '25');
          halo.setAttribute('fill', 'none');
          halo.setAttribute('stroke', '#38bdf8');
          halo.setAttribute('stroke-width', '3');
          halo.setAttribute('stroke-dasharray', '4 2');
          halo.setAttribute('class', 'selection-halo');
          g.appendChild(halo);
        }

        // Active Player Capture Target Ring
        if (isCaptureTarget) {
          const captureRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          captureRing.setAttribute('cx', String(coord.x));
          captureRing.setAttribute('cy', String(coord.y));
          captureRing.setAttribute('r', '25');
          captureRing.setAttribute('fill', 'rgba(239, 68, 68, 0.25)');
          captureRing.setAttribute('stroke', '#ef4444');
          captureRing.setAttribute('stroke-width', '3');
          captureRing.setAttribute('class', 'capture-ring pulse-red');
          g.appendChild(captureRing);
        }

        // Computer Staged Capture Warning Ring
        if (isStagedCapture) {
          const stagedRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          stagedRing.setAttribute('cx', String(coord.x));
          stagedRing.setAttribute('cy', String(coord.y));
          stagedRing.setAttribute('r', '26');
          stagedRing.setAttribute('fill', 'none');
          stagedRing.setAttribute('stroke', '#f59e0b');
          stagedRing.setAttribute('stroke-width', '3');
          stagedRing.setAttribute('stroke-dasharray', '5 3');
          stagedRing.setAttribute('class', 'staged-capture-ring');
          g.appendChild(stagedRing);
        }

        // Recent move destination indicator (where piece landed)
        if (isRecentTo) {
          const recentRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          recentRing.setAttribute('cx', String(coord.x));
          recentRing.setAttribute('cy', String(coord.y));
          recentRing.setAttribute('r', '24');
          recentRing.setAttribute('fill', 'none');
          recentRing.setAttribute('stroke', '#38bdf8');
          recentRing.setAttribute('stroke-width', '2.5');
          recentRing.setAttribute('class', 'recent-move-to');
          g.appendChild(recentRing);
        }

        // The piece itself
        const pieceCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pieceCircle.setAttribute('cx', String(coord.x));
        pieceCircle.setAttribute('cy', String(coord.y));
        pieceCircle.setAttribute('r', '19');
        pieceCircle.setAttribute(
          'fill',
          piece === 1 ? 'url(#grad-white-piece)' : 'url(#grad-black-piece)'
        );
        pieceCircle.setAttribute('filter', 'url(#piece-shadow)');
        pieceCircle.setAttribute('stroke', '#cbd5e1'); // High contrast crisp silver rim for both piece colors
        pieceCircle.setAttribute('stroke-width', '2.5');
        pieceCircle.setAttribute('class', `piece piece-${piece === 1 ? 'white' : 'black'}`);
        g.appendChild(pieceCircle);

        // Inner ridges for dark pieces to enhance tactile depth and contrast
        if (piece === 2) {
          const innerRidge1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          innerRidge1.setAttribute('cx', String(coord.x));
          innerRidge1.setAttribute('cy', String(coord.y));
          innerRidge1.setAttribute('r', '13');
          innerRidge1.setAttribute('fill', 'none');
          innerRidge1.setAttribute('stroke', '#94a3b8');
          innerRidge1.setAttribute('stroke-width', '1.5');
          innerRidge1.setAttribute('pointer-events', 'none');
          g.appendChild(innerRidge1);

          const innerRidge2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          innerRidge2.setAttribute('cx', String(coord.x));
          innerRidge2.setAttribute('cy', String(coord.y));
          innerRidge2.setAttribute('r', '7');
          innerRidge2.setAttribute('fill', 'none');
          innerRidge2.setAttribute('stroke', '#64748b');
          innerRidge2.setAttribute('stroke-width', '1.2');
          innerRidge2.setAttribute('pointer-events', 'none');
          g.appendChild(innerRidge2);
        }
      }

      // Event listener
      g.addEventListener('click', (e) => {
        e.preventDefault();
        this.callbacks.onPointClick(pt);
      });

      this.svg.appendChild(g);
    }
  }

  private drawBoardLines(): void {
    const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linesGroup.setAttribute('class', 'board-lines');
    linesGroup.setAttribute('pointer-events', 'none');

    // 3 Concentric Squares
    const squares = [
      { x: 60, y: 60, size: 480 },
      { x: 135, y: 135, size: 330 },
      { x: 210, y: 210, size: 180 },
    ];

    for (const sq of squares) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(sq.x));
      rect.setAttribute('y', String(sq.y));
      rect.setAttribute('width', String(sq.size));
      rect.setAttribute('height', String(sq.size));
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', '#64748b');
      rect.setAttribute('stroke-width', '4');
      rect.setAttribute('stroke-linejoin', 'round');
      rect.setAttribute('class', 'square-line');
      linesGroup.appendChild(rect);
    }

    // 4 Midpoint Connecting Lines
    const midConnectors = [
      { x1: 300, y1: 60, x2: 300, y2: 210 },  // Top
      { x1: 540, y1: 300, x2: 390, y2: 300 }, // Right
      { x1: 300, y1: 540, x2: 300, y2: 390 }, // Bottom
      { x1: 60, y1: 300, x2: 210, y2: 300 },  // Left
    ];

    for (const lineData of midConnectors) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(lineData.x1));
      line.setAttribute('y1', String(lineData.y1));
      line.setAttribute('x2', String(lineData.x2));
      line.setAttribute('y2', String(lineData.y2));
      line.setAttribute('stroke', '#64748b');
      line.setAttribute('stroke-width', '4');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('class', 'connector-line');
      linesGroup.appendChild(line);
    }

    this.svg.appendChild(linesGroup);
  }
}
