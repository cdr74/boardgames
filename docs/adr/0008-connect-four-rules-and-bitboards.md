# ADR 0008: Connect Four Rules, Bitboard Topology, and Heuristics

## Status
Accepted

## Context
Milestone 3 introduces the platform's third title: **Connect Four**, a classic vertical gravity-drop alignment game played on a 7-column by 6-row vertical grid. Conforming to the platform contracts (`IGameDefinition<ConnectFourState, ConnectFourMove>`), the implementation must provide high-performance move generation, instant win detection, tactical Alpha-Beta heuristic search (Levels 1–5), and an accessible, responsive perforated SVG board.

---

## Decisions

### 1. Board Geometry & Topology
- **Grid Dimensions**: 7 columns $\times$ 6 rows (42 total slots).
- **Coordinate Conventions**:
  - Columns $c \in [0..6]$ (left to right).
  - Rows $r \in [0..5]$ where row 0 is the bottom row (closest to the ground) and row 5 is the top slot.
- **Gravity Mechanics**: Discs drop into a selected column and settle at the lowest unoccupied row index ($r = \text{height}[c]$).
- **Column Capacity**: A column is legal to play if and only if $\text{height}[c] < 6$. If $\text{height}[c] == 6$, the column is full and rejected.

### 2. High-Performance Bitboard Representation
To achieve instant $O(1)$ win checking and deep Alpha-Beta search without allocating objects in search loops, the game state uses a 64-bit bitboard scheme ($7 \times 7$ grid with a sentinel top row per column):
- Bit index for slot $(c, r)$ is $c \times 7 + r$ (bits $0..48$).
- Row 6 in each column ($c \times 7 + 6$) acts as a sentinel boundary bit, ensuring that horizontal and diagonal alignment bit-shifts do not wrap erroneously across column boundaries.
- **Player Bitboards**:
  - `mask`: bitboard of all played discs (`bitboardP1 | bitboardP2`).
  - `currentBitboard`: bitboard of the player whose turn it is.
- **Instantaneous $O(1)$ 4-in-a-Row Alignment Check**:
  A bitboard `bb` contains 4 connected discs if:
  ```ts
  // Horizontal: shift by 7
  (bb & (bb >> 7n) & (bb >> 14n) & (bb >> 21n)) !== 0n ||
  // Vertical: shift by 1
  (bb & (bb >> 1n) & (bb >> 2n) & (bb >> 3n)) !== 0n ||
  // Diagonal (\): shift by 6
  (bb & (bb >> 6n) & (bb >> 12n) & (bb >> 18n)) !== 0n ||
  // Diagonal (/): shift by 8
  (bb & (bb >> 8n) & (bb >> 16n) & (bb >> 24n)) !== 0n
  ```

### 3. Move Representation & State Model
- **Move**: `{ column: number; row: number }`.
- **State**:
  ```ts
  interface ConnectFourState {
    board: Player[][]; // 7x6 array for simple inspection & rendering
    heights: number[]; // Array of 7 column heights (0..6)
    bitboards: [bigint, bigint]; // Bitboards for Player 1 and Player 2
    turn: Player; // 1 (Red, moves 1st) | 2 (Yellow, moves 2nd)
    movesCount: number; // 0..42
    winner: Player | 'draw' | null;
    winReason?: 'connect4' | 'board_full';
    winningCells?: { column: number; row: number }[];
  }
  ```

### 4. Terminal & Draw Conditions
- **Win Condition**: A player successfully aligns 4 or more contiguous discs horizontally, vertically, or diagonally.
- **Draw Condition**: All 42 slots are occupied (`movesCount === 42`) without either player forming a 4-in-a-row alignment.

### 5. Alpha-Beta Heuristic Evaluation & Move Ordering
- **Terminal Value**: $\pm 100,000$ (with search depth penalty: $100000 - \text{depth}$ to prefer quicker wins).
- **Center Column Prioritization**: The central column (column 3) participates in up to 7 distinct 4-in-a-row alignments (3 horizontal, 1 vertical, and 4 diagonal). Discs in column 3 receive +6 points each; columns 2 and 4 receive +3 points each.
- **Threat Configurations**:
  - Open 3-in-a-row alignment (threat with available slot): +50 points.
  - Open 2-in-a-row alignment: +10 points.
- **Exploration Move Ordering**: Columns ordered center-out (`[3, 2, 4, 1, 5, 0, 6]`), maximizing Alpha-Beta beta-cutoffs and pruning efficiency.

### 6. Responsive SVG Board Architecture
- Responsive `viewBox="0 0 700 600"`:
  - 7 columns $\times$ 6 rows, slot pitch $100 \times 100$px (circle cutouts radius 38px, diameter 76px $\ge 48$px mobile ergonomics).
  - Classic perforated game rack with dark blue beveling (`#1e40af` / `#1d4ed8`) and drop-shadows.
  - Distinct piece styling: Red discs (`#ef4444` gradient with silver rim) vs Yellow discs (`#fbbf24` gradient with golden amber rim).
  - Animated disc gravity drop transitions.
  - Glowing highlight line connecting the winning 4 discs.

---

## Consequences
- Ultra-fast $O(1)$ bitboard operations guarantee instant search down to depth 8+ in Web Worker threads without latency.
- Completely isolated module in `src/games/connect-four/` with zero cross-game dependencies.
- Perfect parity with existing lobby and `GenericMinimaxEngine`.
