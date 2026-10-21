# ADR 0009: Reversi / Othello Rules, Flanking Mechanics, and Stability Heuristics

## Status
Accepted

## Context
Milestone 4 introduces the platform's fourth deterministic title: **Reversi** (commonly known as *Othello*), an 8x8 disc-flipping territory game. Played on a 64-square grid, players take turns trapping opponent discs between their own to flip them. The engine must adhere to platform boundaries (`IGameDefinition<ReversiState, ReversiMove>`), support automated pass detection, provide deep tactical heuristics (mobility, corner stability, frontier minimization, endgame coin parity), and render a responsive native SVG board with classic green felt aesthetics.

---

## Decisions

### 1. Board Geometry & State Representation
- **Grid Dimensions**: 8 columns $\times$ 8 rows = 64 squares.
- **Coordinate Conventions**:
  - `col` $\in [0..7]$ (columns a–h)
  - `row` $\in [0..7]$ (rows 1–8)
  - Flat index: `index = row * 8 + col` $\in [0..63]$.
- **Initial Setup (Classic Othello Center Cross)**:
  - Square 27 `(col 3, row 3, d4)`: White (Player 2)
  - Square 28 `(col 4, row 3, e4)`: Black (Player 1)
  - Square 35 `(col 3, row 4, d5)`: Black (Player 1)
  - Square 36 `(col 4, row 4, e5)`: White (Player 2)
- **Active Turn & Piece Colors**:
  - Player 1 = Black (moves first)
  - Player 2 = White (moves second)
- **State Model**:
  ```ts
  interface ReversiState {
    board: (0 | 1 | 2)[]; // 64 elements, 0=Empty, 1=Black, 2=White
    turn: Player;
    blackCount: number;
    whiteCount: number;
    movesCount: number;
    lastMove: ReversiMove | null;
    isPass: boolean;
    winner: Player | 'draw' | null;
    winReason?: 'board_full' | 'no_moves' | 'wipeout';
  }
  ```

### 2. Ray Flanking Mechanics & Disc Flipping
- A move consists of placing a disc of the active player's color on an empty square $(c, r)$.
- A move is legal if and only if it brackets and flips at least one opponent disc along at least one of the 8 cardinal and diagonal directions:
  $$\Delta \in \{(-1,-1), (0,-1), (1,-1), (-1,0), (1,0), (-1,1), (0,1), (1,1)\}$$
- For each direction:
  - Step outward one square at a time.
  - Encounter contiguous opponent discs ($n \ge 1$).
  - Immediately terminated by a disc of the active player without hitting an empty cell or board edge.
- When applied, all bracketed opponent discs across all valid flanking directions are flipped to the active player's color.

### 3. Pass Mechanics & Game Termination
- **Mandatory Pass**:
  If the active player has 0 legal moves, but the opponent has $\ge 1$ legal move:
  - The turn automatically passes to the opponent (`isPass = true`).
  - No discs are placed.
- **Terminal States**:
  The game terminates if:
  1. Neither player has any legal moves (including double-pass or full 64-disc board).
  2. One player's disc count drops to 0 (wipeout).
- **Winner Determination**:
  - `blackCount > whiteCount` $\rightarrow$ Black wins.
  - `whiteCount > blackCount` $\rightarrow$ White wins.
  - `blackCount === whiteCount` $\rightarrow$ Draw.

### 4. Alpha-Beta Heuristic Evaluation & Move Ordering
Strategic Reversi play requires non-linear heuristic evaluation that transitions across game phases:
1. **Corner Stability (+300 pts)**:
   - Corners (`0, 7, 56, 63`) cannot be flipped once claimed and serve as anchors for stable edges.
2. **C-Square and X-Square Danger (-150 / -50 pts)**:
   - X-squares (`9, 14, 49, 54`) and C-squares adjacent to vacant corners are penalized severely because they grant the opponent direct access to the corner.
   - If the adjacent corner is already owned, the penalty is nullified.
3. **Mobility Differential (Weight 20)**:
   - Restricting opponent legal moves is paramount in the early and middle game to force unfavorable moves or passes.
   - $Score_{mobility} = (LegalMoves_{player} - LegalMoves_{opponent}) \times 20$.
4. **Frontier Disc Minimization (Weight -5)**:
   - Discs adjacent to one or more empty squares are exposed to opponent flips. Minimizing frontier discs keeps the player's position compact and resilient.
5. **Phase-Dependent Coin Parity**:
   - In early game ($< 25$ moves), piece count is irrelevant or counter-productive (weight $\approx 0$).
   - In mid-game ($25..50$ moves), weight is slight.
   - In late game ($> 50$ moves) and terminal nodes, coin parity dominates.
6. **Move Ordering**:
   - Moves ordered by static positional weight table (corners first, interior second, danger squares last) to maximize Alpha-Beta beta cutoffs.

### 5. Responsive SVG Board Design
- `viewBox="0 0 640 640"` with an $8 \times 8$ grid of $80 \times 80$px squares.
- Deep forest green felt aesthetic (`#15803d` / `#166534`) with crisp dark borders (`#14532d`).
- Four classic white/gold star marker dots at `(2,2), (6,2), (2,6), (6,6)`.
- Discs styled with high-contrast tactile rims and dual concentric ridges:
  - Black: `#cbd5e1` silver rim and inner ridges.
  - White: `#ffffff` ivory disc with `#cbd5e1` rim.
- Semi-transparent legal move dots on human turn to guide accessible play.
- Minimum touch target: $80 \times 80$px ($\ge 48$px mobile ergonomics).

---

## Consequences
- Clean pluggable module in `src/games/reversi/` with zero dependencies on sibling games.
- Seamless integration with `GenericMinimaxEngine` and Web Worker bridge.
- Robust handling of single and consecutive passes in game loop.
