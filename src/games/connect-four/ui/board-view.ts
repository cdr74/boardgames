import { COLS, ROWS } from '../constants';
import { ConnectFourMove, ConnectFourState, EMPTY } from '../types';

export interface ConnectFourBoardViewCallbacks {
  onColumnClick: (column: number) => void;
}

export class ConnectFourBoardView {
  private container: HTMLElement;
  private svg: SVGSVGElement;
  private callbacks: ConnectFourBoardViewCallbacks;
  private recentMove: ConnectFourMove | null = null;

  constructor(container: HTMLElement, callbacks: ConnectFourBoardViewCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.initSvg();
  }

  private initSvg(): void {
    this.svg.setAttribute('viewBox', '0 0 700 600');
    this.svg.setAttribute('class', 'game-board-svg connect-four-board-svg');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', 'Connect Four Game Board');
    this.container.appendChild(this.svg);
  }

  public setRecentMove(move: ConnectFourMove | null): void {
    this.recentMove = move;
  }

  public clearVisualFeedback(): void {
    this.recentMove = null;
  }

  public render(state: ConnectFourState): void {
    // Clear svg content
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <radialGradient id="c4-grad-red" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#f87171"/>
        <stop offset="50%" stop-color="#dc2626"/>
        <stop offset="90%" stop-color="#991b1b"/>
        <stop offset="100%" stop-color="#7f1d1d"/>
      </radialGradient>
      <radialGradient id="c4-grad-yellow" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="45%" stop-color="#facc15"/>
        <stop offset="85%" stop-color="#ca8a04"/>
        <stop offset="100%" stop-color="#854d0e"/>
      </radialGradient>
      <filter id="c4-piece-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity="0.45"/>
      </filter>
      <filter id="c4-glow-win" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <mask id="c4-rack-mask">
        <!-- Solid white base -->
        <rect x="0" y="0" width="700" height="600" rx="20" fill="white" />
        <!-- 42 transparent circular cutouts -->
        ${Array.from({ length: COLS })
          .map((_, c) =>
            Array.from({ length: ROWS })
              .map((_, r) => {
                const cx = c * 100 + 50;
                const cy = (ROWS - 1 - r) * 100 + 50;
                return `<circle cx="${cx}" cy="${cy}" r="37" fill="black" />`;
              })
              .join('')
          )
          .join('')}
      </mask>
    `;
    this.svg.appendChild(defs);

    // 1. Dark Board Interior Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', '700');
    bg.setAttribute('height', '600');
    bg.setAttribute('rx', '20');
    bg.setAttribute('fill', '#090d16');
    this.svg.appendChild(bg);

    // Empty slot backing circles
    const slotsBackingGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    slotsBackingGroup.setAttribute('class', 'c4-slots-backing');
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cx = c * 100 + 50;
        const cy = (ROWS - 1 - r) * 100 + 50;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', '37');
        circle.setAttribute('fill', '#0f172a');
        circle.setAttribute('stroke', '#020617');
        circle.setAttribute('stroke-width', '2');
        slotsBackingGroup.appendChild(circle);
      }
    }
    this.svg.appendChild(slotsBackingGroup);

    // 2. Played Discs Layer
    const piecesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    piecesGroup.setAttribute('class', 'c4-pieces-layer');
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cell = state.board[c][r];
        if (cell === EMPTY) continue;

        const cx = c * 100 + 50;
        const cy = (ROWS - 1 - r) * 100 + 50;

        const discG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        discG.setAttribute(
          'class',
          `c4-disc ${cell === 1 ? 'disc-red' : 'disc-yellow'}`
        );
        discG.setAttribute('data-col', String(c));
        discG.setAttribute('data-row', String(r));

        // Outer piece circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', '36');
        circle.setAttribute('fill', cell === 1 ? 'url(#c4-grad-red)' : 'url(#c4-grad-yellow)');
        circle.setAttribute('stroke', cell === 1 ? '#fca5a5' : '#fef08a');
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('filter', 'url(#c4-piece-shadow)');
        discG.appendChild(circle);

        // Tactile concentric groove 1
        const ridge1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ridge1.setAttribute('cx', String(cx));
        ridge1.setAttribute('cy', String(cy));
        ridge1.setAttribute('r', '24');
        ridge1.setAttribute('fill', 'none');
        ridge1.setAttribute('stroke', cell === 1 ? '#b91c1c' : '#ca8a04');
        ridge1.setAttribute('stroke-width', '1.5');
        discG.appendChild(ridge1);

        // Tactile concentric groove 2
        const ridge2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ridge2.setAttribute('cx', String(cx));
        ridge2.setAttribute('cy', String(cy));
        ridge2.setAttribute('r', '14');
        ridge2.setAttribute('fill', 'none');
        ridge2.setAttribute('stroke', cell === 1 ? '#7f1d1d' : '#854d0e');
        ridge2.setAttribute('stroke-width', '1.2');
        discG.appendChild(ridge2);

        piecesGroup.appendChild(discG);
      }
    }
    this.svg.appendChild(piecesGroup);

    // 3. Perforated Front Blue Rack Plate
    const rackPlate = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rackPlate.setAttribute('class', 'c4-rack-plate');
    rackPlate.setAttribute('x', '0');
    rackPlate.setAttribute('y', '0');
    rackPlate.setAttribute('width', '700');
    rackPlate.setAttribute('height', '600');
    rackPlate.setAttribute('rx', '20');
    rackPlate.setAttribute('fill', '#1d4ed8'); // Classic vibrant game rack blue
    rackPlate.setAttribute('stroke', '#1e3a8a');
    rackPlate.setAttribute('stroke-width', '4');
    rackPlate.setAttribute('mask', 'url(#c4-rack-mask)');
    rackPlate.setAttribute('pointer-events', 'none');
    this.svg.appendChild(rackPlate);

    // Bevel rims around cutouts for 3D rack depth
    const rimsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    rimsGroup.setAttribute('class', 'c4-cutout-rims');
    rimsGroup.setAttribute('pointer-events', 'none');
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cx = c * 100 + 50;
        const cy = (ROWS - 1 - r) * 100 + 50;
        const rim = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        rim.setAttribute('cx', String(cx));
        rim.setAttribute('cy', String(cy));
        rim.setAttribute('r', '37');
        rim.setAttribute('fill', 'none');
        rim.setAttribute('stroke', '#1e3a8a');
        rim.setAttribute('stroke-width', '2.5');
        rimsGroup.appendChild(rim);
      }
    }
    this.svg.appendChild(rimsGroup);

    // 4. Recent Move Ring Indicator
    if (this.recentMove) {
      const cx = this.recentMove.column * 100 + 50;
      const cy = (ROWS - 1 - this.recentMove.row) * 100 + 50;
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', String(cx));
      ring.setAttribute('cy', String(cy));
      ring.setAttribute('r', '40');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#38bdf8');
      ring.setAttribute('stroke-width', '3');
      ring.setAttribute('stroke-dasharray', '5 3');
      ring.setAttribute('class', 'recent-move-to pulse');
      ring.setAttribute('pointer-events', 'none');
      this.svg.appendChild(ring);
    }

    // 5. Winning Alignment Highlight (Line + Glowing Rings)
    if (state.winningCells && state.winningCells.length >= 4) {
      const winGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      winGroup.setAttribute('class', 'c4-winning-line-group');
      winGroup.setAttribute('pointer-events', 'none');

      const cells = state.winningCells;
      const p1 = cells[0];
      const p4 = cells[cells.length - 1];

      const x1 = p1.column * 100 + 50;
      const y1 = (ROWS - 1 - p1.row) * 100 + 50;
      const x2 = p4.column * 100 + 50;
      const y2 = (ROWS - 1 - p4.row) * 100 + 50;

      // Connecting line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y2));
      line.setAttribute('stroke', '#10b981');
      line.setAttribute('stroke-width', '7');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('filter', 'url(#c4-glow-win)');
      line.setAttribute('opacity', '0.9');
      winGroup.appendChild(line);

      // Halos around winning discs
      for (const cell of cells) {
        const cx = cell.column * 100 + 50;
        const cy = (ROWS - 1 - cell.row) * 100 + 50;
        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        halo.setAttribute('cx', String(cx));
        halo.setAttribute('cy', String(cy));
        halo.setAttribute('r', '40');
        halo.setAttribute('fill', 'none');
        halo.setAttribute('stroke', '#10b981');
        halo.setAttribute('stroke-width', '3.5');
        halo.setAttribute('class', 'pulse');
        winGroup.appendChild(halo);
      }

      this.svg.appendChild(winGroup);
    }

    // 6. Interactive Column Hitboxes
    const columnsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    columnsGroup.setAttribute('class', 'c4-columns-interactive');
    for (let c = 0; c < COLS; c++) {
      const isFull = state.heights[c] >= ROWS;
      const isGameOver = state.winner !== null;

      const colG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      colG.setAttribute('class', `c4-column-target ${isFull ? 'col-full' : 'col-open'}`);
      colG.setAttribute('data-column', String(c));
      colG.setAttribute('role', 'button');
      colG.setAttribute('aria-label', `Column ${c + 1}${isFull ? ' (Full)' : ''}`);
      colG.setAttribute('tabindex', !isFull && !isGameOver ? '0' : '-1');

      // Full column touch target: 100px width x 600px height (far exceeding 48px minimum)
      const hitRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hitRect.setAttribute('x', String(c * 100));
      hitRect.setAttribute('y', '0');
      hitRect.setAttribute('width', '100');
      hitRect.setAttribute('height', '600');
      hitRect.setAttribute('fill', 'transparent');
      hitRect.style.cursor = isFull || isGameOver ? 'default' : 'pointer';
      colG.appendChild(hitRect);

      if (!isFull && !isGameOver) {
        colG.addEventListener('click', (e) => {
          e.preventDefault();
          this.callbacks.onColumnClick(c);
        });

        colG.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.callbacks.onColumnClick(c);
          }
        });
      }

      columnsGroup.appendChild(colG);
    }
    this.svg.appendChild(columnsGroup);
  }
}
