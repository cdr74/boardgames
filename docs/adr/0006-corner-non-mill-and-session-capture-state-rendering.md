# ADR 0006: Corner Non-Mill Invariant and Interim Capture State Rendering

## Status
Accepted

## Context
A gameplay defect was observed where a player perceived a mill being detected for 3 pieces configured around a corner (an L-shape such as points 7-0-1 or diagonal corner configurations), prompting a thorough investigation into mill rules, topological geometry, and presentation state synchronization in Nine Men's Morris.

Investigation revealed:
1. **Mathematical Mill Topology**: Standard Nine Men's Morris contains exactly 16 valid mills:
   - 4 outer square horizontal/vertical edges (`[0, 1, 2]`, `[2, 3, 4]`, `[4, 5, 6]`, `[6, 7, 0]`)
   - 4 middle square horizontal/vertical edges (`[8, 9, 10]`, `[10, 11, 12]`, `[12, 13, 14]`, `[14, 15, 8]`)
   - 4 inner square horizontal/vertical edges (`[16, 17, 18]`, `[18, 19, 20]`, `[20, 21, 22]`, `[22, 23, 16]`)
   - 4 midpoint cross-connectors (`[1, 9, 17]`, `[3, 11, 19]`, `[5, 13, 21]`, `[7, 15, 23]`)
   Every valid mill is strictly collinear. Corners are degree-2 vertices where lines meet at 90°. Bending around corners (L-shapes) or jumping diagonally across corners (e.g. 0-8-16) is strictly prohibited.
2. **Session Presentation Desynchronization Bug**: In `src/shell/session.ts` (`handleMorrisPointClick`), when a player forms a valid mill (via placement or slide), the engine set `pendingCapture = true` and updated the HUD, but **did not render the newly placed or moved piece on the board** before requiring a capture click. Consequently, the user's board displayed only previously placed pieces (which may have been clustered around a corner) while the HUD proclaimed "Mill formed!", creating the misleading appearance that the existing corner pieces triggered the mill.
3. **Engine Asynchronous Race Bug**: In `src/shell/session.ts` (`triggerEngineMove()`), `this.executeEngineMove(result.bestMove)` was called without `await`. Since `executeEngineMove` is `async` with an internal 550ms delay for capture staging animations, execution immediately fell through to `finally { this.isEngineThinking = false; }`, unblocking user interactions and corrupting HUD messages prematurely while engine moves were in flight.

## Decisions

### 1. Architectural Invariant: Strict Collinear Mill Rule & Exhaustive Verification
- The 16 defined collinear mills are formally codified and locked as the sole valid mill configurations.
- An exhaustive automated test suite will verify all 12 L-shaped corner triplets, all 4 diagonal corner triplets, and all $\binom{24}{3} = 2,024$ possible point triplets across the board, guaranteeing that no non-collinear triplet can ever produce a mill.

### 2. Interim State Board Rendering on Mill Formation
- In `GameSession.handleMorrisPointClick`, when a move creates a mill:
  - Generate an `interimState` showing the placed or moved piece immediately on the board.
  - Call `this.boardView.render(interimState)` and display pulsating capture targets.
  - Update the HUD with the mill announcement.
- The user will visually see the complete 3-in-a-row straight line on the board before selecting an opponent piece to capture.

### 3. Await Asynchronous Engine Move Execution
- In `GameSession.triggerEngineMove`, `await this.executeEngineMove(result.bestMove)` will be enforced so that `isEngineThinking` remains `true` throughout the full capture animation and until the move state is completely committed to `this.state`.

### 4. SVG Pointer Event Isolation
- In `BoardView`, assign explicit inline `pointer-events="none"` to `.board-lines` and background shapes to ensure user taps/clicks never misroute to adjacent lines or points.

## Consequences
- **User Clarity**: Players always see their placed piece complete the straight line before being prompted to capture, eliminating visual confusion with previously placed corner pieces.
- **State Integrity**: Eliminates async race conditions between engine animations and user clicks.
- **Test Assurance**: Full combinatorial coverage guarantees no regression in mill detection topology.
