# ADR-0010: Difficulty Calibration and Game-Specific Heuristic Scaling

* **Status:** Accepted
* **Date:** 2026-10-21
* **Deciders:** cdr74, Engineering Team
* **Consulted:** User Testing Feedback (Google Pixel Device Validation)

---

## Context
During device playtesting of Release `v0.3.1`, user validation revealed that:
1. **Reversi / Othello:** Even on Medium (Level 3), the engine played at an overwhelming, master-level strength, easily suffocating casual players by mid-game.
2. **Connect Four:** The engine played with near-flawless tactical accuracy ("aces it") on Medium, punishing slight inaccuracies by foreseeing 4-ply fork combinations that casual mobile players cannot anticipate.

### Root Cause Analysis
1. **Evaluation Scale vs. Epsilon Mismatch:**
   - Epsilon candidate pooling (`rawPool = candidates.filter(c => c.score >= bestScore - epsilon)`) used fixed global values ($\epsilon=12$ for Level 3, $\epsilon=30$ for Level 2).
   - In Reversi, evaluations range across hundreds of points (mobility is up to $\pm 400$, corners $\pm 200$, X-squares $-50$).
   - A difference between an optimal move and an intermediate natural move in Reversi is typically $40\text{--}100+$ points.
   - Because the delta exceeded $\epsilon$, the candidate pool contained solely the single optimal move (`rawPool.length === 1`). Softmax sampling was never exercised, rendering Levels 2 and 3 robotic and optimal.
2. **Mobility Starvation Heuristic Dominance:**
   - Master-level Reversi strategy hinges on restricting opponent mobility. In `evaluateReversiState`, mobility differential was multiplied by 4 ($\pm 400$).
   - Applying this full tournament-level heuristic at all difficulty levels caused the AI on Level 2/3 to play ruthless mobility starvation against human players.
3. **Connect Four Lookahead Depth:**
   - Connect Four has a small branching factor (at most 7 moves).
   - Searching 4 plies ahead on Level 3 evaluates two full turns ahead (Engine $\to$ Human $\to$ Engine $\to$ Human), discovering all double-attack forks and forcing wins.

---

## Decision
We implement a unified, multi-tier calibration architecture:

1. **Game-Specific Difficulty Configuration Contract:**
   - Extend `IGameDefinition` with an optional `getDifficultyConfig?(level: DifficultyLevel): Partial<EngineSearchOptions>`.
   - Allows games with distinct state spaces or scoring magnitudes (like Reversi and Connect Four) to tune depth, candidate pool $\epsilon$, softmax temperature, and blunder rates without altering platform contracts.
2. **Blunder Rate & Candidate Selection Protocol:**
   - Extend `EngineSearchOptions` with `blunderRate?: number`.
   - **Level 1 (Beginner):** 35% blunder factor across legal moves to facilitate learning for novice players.
   - **Levels 2 & 3 (Easy & Medium):** 0% random blunder rate to prevent ridiculous blunders on immediate tactical moves (such as mill closures or direct wins), relying instead on widened candidate pools ($\epsilon$) and softmax temperature ($T$) to introduce natural, human-like positional variety.
   - **Levels 4–5 (Hard & Master):** 0% blunder rate (strictly deterministic/optimal Alpha-Beta with tight $\epsilon$).
3. **Connect Four Calibration:**
   - Adjust Level 3 (Medium) default depth to **Depth 3** (from Depth 4). At Depth 3, the engine blocks direct 1-move threats and attacks immediately, but does not calculate 4-ply double-fork traps.
   - Adjust candidate pool $\epsilon=16$, temperature $14$ on Level 3; $\epsilon=35$, temperature $20$ on Level 2.
4. **Reversi Heuristic & Epsilon Calibration:**
   - Extend `evaluateState` to accept the current `difficulty?: DifficultyLevel`.
   - Scale mobility and frontier weights by difficulty tier:
     - **Level 1 (Beginner):** Mobility $\times 0$, Frontier $\times 0$ (focuses on disc counts, corners, and positional weights).
     - **Level 2 (Easy):** Mobility $\times 1$ ($\pm 100$), Frontier $\times 2$.
     - **Level 3 (Medium):** Mobility $\times 2$ ($\pm 200$), Frontier $\times 4$.
     - **Levels 4–5 (Hard/Master):** Full mobility $\times 4$ ($\pm 400$), Frontier $\times 6$.
   - Scale Reversi $\epsilon$ values:
     - Level 1: $\epsilon=160, T=40$
     - Level 2: $\epsilon=90, T=25$
     - Level 3: $\epsilon=45, T=18$
     - Level 4: $\epsilon=10, T=6$
     - Level 5: $\epsilon=0, T=1$ (strictly optimal Alpha-Beta).

---

## Consequences
- **Positive:**
  - Connect Four and Reversi now feel natural, enjoyable, and human-like on Levels 1–3, allowing intermediate players to compete fairly and win with solid play.
  - Hard (Level 4) and Master (Level 5) remain uncompromisingly sharp with deep Alpha-Beta search and full heuristics.
  - Zero architectural regressions: `IGameDefinition` remains backward-compatible for Morris and Checkers.
- **Negative:**
  - Additional configuration parameters to maintain per game module.
