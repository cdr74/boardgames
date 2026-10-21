# Product Backlog & Roadmap: Classic Board Games

This backlog tracks architectural milestones, game implementations, and session handoffs for the unified multi-game platform.

---

## 📌 Session Handoff & Active State
* **Last Completed Milestone:** Milestone 2: Game 2 — English Checkers / Draughts (Ref: ADR-0007, Tasks TASK-201..208)
* **Active Working Tree:** Milestone 3 In Progress (Connect Four Rules & Bitboards locked in ADR-0008)
* **Immediate Next Focus:** Milestone 3: Game 3 — Connect Four (Tasks TASK-302 to TASK-306)

---

## Milestone 1: Platform Core Scaffolding & Nine Men's Morris Baseline (Status: 🟢 Complete)
Goal: Extract and establish the modular multi-game platform core, implement the startup Game Lobby menu list, import Nine Men's Morris as the initial playable game, and verify test suite.

- [x] **TASK-101:** Project documentation suite (README, ADRs 0001–0004, System Design, Backlog, User Guide, Instructions).
- [x] **TASK-102:** Tooling scaffolding (Vite 5, TypeScript 5.5, Vitest 2, CI workflow `.github/workflows/ci.yml`).
- [x] **TASK-103:** Platform core abstractions (`src/platform/types.ts`, `GenericMinimaxEngine`, difficulty configurations, worker protocol).
- [x] **TASK-104:** Startup Game Lobby / Menu list component (`src/shell/lobby.ts`) allowing game selection.
- [x] **TASK-105:** Universal Game Session Manager (`src/shell/session.ts`) handling turns, history stack, undo, timer, and HUD bridge.
- [x] **TASK-106:** Nine Men's Morris module import (`src/games/morris/`) and SVG board integration.
- [x] **TASK-107:** Automated test suite verifying platform contracts and Morris rules/engine.
- [x] **TASK-108:** Nine Men's Morris SVG board presentation resilience and complete theme styling (`src/style.css`, `src/games/morris/ui/board-view.ts`, Ref: ADR-0005).
- [x] **TASK-109:** Morris corner non-mill verification, session capture interim state rendering, and async engine await synchronization (`src/shell/session.ts`, `src/games/morris/ui/board-view.ts`, `tests/games/morris/corner-mill.test.ts`, Ref: ADR-0006).
- [x] **TASK-110:** Streamline Game Lobby cards by removing redundant light-blue card subtitles (`src/shell/lobby.ts`, `src/style.css`, `tests/shell/lobby.test.ts`).

---

## Milestone 2: Game 2 — English Checkers / Draughts (Status: 🟢 Complete)
Goal: Implement standard 8x8 English Checkers (Draughts) with diagonal sliding, mandatory multi-jump sequences, king crowning, and Alpha-Beta AI.

- [x] **TASK-201:** Architecture Decision Record & Rules Specification (Ref: `docs/adr/0007-english-checkers-rules-and-heuristics.md`).
- [x] **TASK-202:** Implement board representation (8x8 grid, 32 playable dark squares) and piece state in `src/games/checkers/board.ts` and `src/games/checkers/types.ts`.
- [x] **TASK-203:** Implement move generator in `src/games/checkers/rules.ts` (diagonal steps, mandatory jumps, multi-jump continuations, king crowning).
- [x] **TASK-204:** Implement heuristic evaluator in `src/games/checkers/evaluator.ts` (material values, center control, back-row defense, mobility).
- [x] **TASK-205:** Implement `CheckersGameDefinition` conforming to `IGameDefinition<CheckersState, CheckersMove>` and register in worker (`src/platform/worker/worker.ts`).
- [x] **TASK-206:** Implement responsive 8x8 SVG board renderer (`src/games/checkers/ui/board-view.ts`) with touch hitboxes and jump-path highlights.
- [x] **TASK-207:** Register Checkers in startup Game Lobby menu list (`src/games/registry.ts`) and integrate with universal session (`src/shell/session.ts`).
- [x] **TASK-208:** Automated unit, engine, and variability tests in `tests/games/checkers/`.

---

## Milestone 3: Game 3 — Connect Four (Status: 🟢 Completed)
Goal: Implement classic 7x6 vertical gravity drop alignment game.

- [x] **TASK-301:** ADR & Rules Specification (Ref: `docs/adr/0008-connect-four-rules-and-bitboards.md`).
- [x] **TASK-302:** Implement 7x6 board representation, gravity drop mechanics, and contiguous 4-in-a-row detection.
- [x] **TASK-303:** Implement heuristic evaluator (center column priority, open-ended 2- and 3-in-a-row threat weights).
- [x] **TASK-304:** Implement `ConnectFourGameDefinition`.
- [x] **TASK-305:** Implement responsive 7x6 perforated SVG board with drop bounce animations.
- [x] **TASK-306:** Register Connect Four in Game Lobby menu list and create automated test suite.

---

## Milestone 4: Game 4 — Reversi / Othello (Status: 🟡 In Progress)
Goal: Implement 8x8 territory flanking and disc-flipping strategy game.

- [x] **TASK-401:** ADR & Rules Specification (Ref: `docs/adr/0009-reversi-rules-and-stability-heuristics.md`).
- [ ] **TASK-402:** Implement 8x8 board representation, 8-directional ray flanking calculations, disc flipping, and pass mechanics.
- [ ] **TASK-403:** Implement heuristic evaluator (corner stability, frontier piece minimization, mobility restriction).
- [ ] **TASK-404:** Implement `ReversiGameDefinition`.
- [ ] **TASK-405:** Implement responsive 8x8 felt SVG board with legal flip previews.
- [ ] **TASK-406:** Register Reversi in Game Lobby menu list and create automated test suite.

---

## Milestone 5: Audio Synthesizer, Haptics & Accessibility (Status: ⚪ Planned)
Goal: Universal sensory feedback using native Web APIs without external media assets.

- [ ] **TASK-501:** Web Audio API sound generator for piece tap, sliding friction, capture strikes, and victory fanfare.
- [ ] **TASK-502:** Web Vibration API (`navigator.vibrate`) for subtle haptic feedback on touch moves.
- [ ] **TASK-503:** Keyboard navigation support (arrow keys + Enter/Space) for accessible board navigation.
- [ ] **TASK-504:** ARIA live region announcements for board moves, captures, and turn changes.

---

## Milestone 6: PWA Offline Shell, Persistence & Android Packaging (Status: 🟡 In Progress)
Goal: Full offline capability, cross-session local persistence, and native Android APK release automation.

- [ ] **TASK-601:** Web App Manifest and Service Worker with CacheFirst offline caching strategy.
- [ ] **TASK-602:** LocalStorage persistence for auto-saving active match states per game.
- [x] **TASK-603:** Configure Capacitor with app ID `com.cdr74.boardgames` and adaptive icons.
- [x] **TASK-604:** `.github/workflows/release-android.yml` for automated APK build and GitHub Releases.
