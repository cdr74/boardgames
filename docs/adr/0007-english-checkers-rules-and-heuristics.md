# ADR 0007: English Checkers (Draughts) Rules, Board Representation, and Heuristics

## Status
Accepted

## Context
Milestone 2 expands the deterministic multi-game boardgame platform with its second title: **English Checkers** (American Checkers / 8x8 Straight Draughts conforming to WCDF standards). The platform requires a modular, zero-dependency core implementation conforming to `IGameDefinition<CheckersState, CheckersMove>`, powered by the existing `GenericMinimaxEngine` and Web Worker search client.

## Decisions

### 1. Board Representation & Coordinate Geometry
- **Playable Grid**: The standard 8x8 checkerboard comprises 64 squares, of which only the 32 dark squares are playable.
- **Indexing Scheme**: The 32 dark squares are indexed 0 to 31 (corresponding to standard Draughts notation 1 to 32):
  - Row 0 (White home / Black king row): dark squares at columns 1, 3, 5, 7 (indices 0..3)
  - Row 1: dark squares at columns 0, 2, 4, 6 (indices 4..7)
  - Row 2: dark squares at columns 1, 3, 5, 7 (indices 8..11)
  - Row 3: dark squares at columns 0, 2, 4, 6 (indices 12..15)
  - Row 4: dark squares at columns 1, 3, 5, 7 (indices 16..19)
  - Row 5: dark squares at columns 0, 2, 4, 6 (indices 20..23)
  - Row 6: dark squares at columns 1, 3, 5, 7 (indices 24..27)
  - Row 7 (Black home / White king row): dark squares at columns 0, 2, 4, 6 (indices 28..31)
- **Orientation**: Single corner at each player's bottom-left (South has single corner at (col 0, row 7), North has single corner at (col 7, row 0)).
- **Initial Setup**:
  - Player 1 (Black / Dark): 12 pieces starting on squares 20..31 (rows 5..7), moving upwards toward row 0.
  - Player 2 (White / Light): 12 pieces starting on squares 0..11 (rows 0..2), moving downwards toward row 7.
  - Squares 12..19 (rows 3..4) are empty.
- **Turn Order**: Player 1 (Black) moves first.

### 2. Move Rules & Mechanics
- **Simple Moves**: Diagonal step of 1 square to an unoccupied adjacent dark square. Men move forward only (Black -row, White +row); Kings move in all 4 diagonal directions.
- **Captures / Jumps**:
  - An adjacent diagonal square contains an opponent piece, and the immediate square beyond in the same diagonal line is empty.
  - The jumping piece lands on the destination square, and the jumped opponent piece is captured and removed.
- **Mandatory Jump Rule**: If any jump is available for any of the active player's pieces, simple moves are strictly illegal.
- **Multi-Jump Continuation**: If a piece completes a jump and has another legal jump from its new square, it must continue jumping until no further jumps remain. If branching jump sequences exist, the player may choose any legal sequence (English rules do not enforce majority capture).
- **King Crowning & Immediate Turn End**:
  - When a man reaches the opponent's back rank (row 0 for Black, row 7 for White), it is crowned King.
  - If a man reaches the king row during a multi-jump, it is crowned King and its turn terminates immediately; it cannot continue jumping on that turn.

### 3. Terminal & Draw Conditions
- **Win Conditions**:
  - Annihilation: Opponent has 0 pieces remaining.
  - Trapped: Opponent has no legal moves on their turn.
- **Draw Conditions**:
  - 40-move rule: 40 consecutive moves by each player (80 plies) without a capture or a man advance.
  - Threefold repetition: The exact position recurs 3 times in the match history.

### 4. Alpha-Beta Heuristic Evaluation
The evaluation function evaluates positions from the perspective of the searching player:
- **Material Weights**:
  - Man = 100
  - King = 175
- **Positional Factors**:
  - **Rank Advancement**: Men receive +3 points per advanced rank toward the king row.
  - **Center Control**: Squares in the central 4x4 zone (squares 9, 10, 13, 14, 17, 18, 21, 22) receive +6 points.
  - **Back-Row Defense**: Pieces on the home row (row 7 for Black, row 0 for White) receive +12 points to deter opponent crowning while pieces remain.
  - **Edge Vulnerability**: Men on outer columns (col 0 or 7) have restricted diagonal branches and receive -4 points.
- **Mobility**: +3 points per legal move available to the player.
- **Move Ordering**: Captures first (multi-jumps before single jumps), king moves second, center advancements third.

### 5. SVG Presentation Architecture
- Symmetrical with Nine Men's Morris `BoardView`:
  - 8x8 responsive SVG board (`viewBox="0 0 640 640"`), 80x80px square cells.
  - Touch targets with diameter $\ge 48$px for mobile ergonomics.
  - Selection halo around active piece, highlighted legal destinations, trajectory paths for multi-jumps, and crown icons on kings.

## Consequences
- Guarantees full standard English Checkers tournament rule parity.
- Seamless integration with existing `GenericMinimaxEngine` and Worker protocol without altering platform contracts.
- Independent, isolated module in `src/games/checkers/` with zero cross-game dependencies.
