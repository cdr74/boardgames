# Classic Board Games - Project Guidelines & Boundaries

## Project Overview
A multi-game deterministic boardgame suite featuring on-device Alpha-Beta search and scalable difficulty levels (Levels 1–5). Playable in desktop and mobile browsers and as an Android PWA / Capacitor APK.

* **Repository:** `https://github.com/cdr74/boardgames`
* **Stack:** Vanilla TypeScript + Native Responsive SVG + Vite + Vitest + Capacitor

---

## Architectural Boundaries

1. **`src/platform/` (Platform Core & Contracts):**
   - Agnostic to any specific game rules or topologies.
   - Contains `IGameDefinition<TState, TMove>`, `GenericMinimaxEngine<TState, TMove>`, difficulty configurations, and Web Worker thread protocol.
   - 100% pure TypeScript with zero DOM/browser dependencies.

2. **`src/games/<gameId>/` (Pluggable Game Modules):**
   - Each game is an isolated module: `morris/`, `checkers/`, `connect-four/`, `reversi/`.
   - Contains game rules, move generation, heuristics, SVG renderer, and `IGameDefinition` implementation.
   - Zero dependencies across sibling games.

3. **`src/shell/` (Presentation & App Shell):**
   - Startup Game Lobby / Menu list for selecting games.
   - Universal HUD, Undo/Redo history controller, player color selection, and Web Worker client bridge.
   - Native SVG rendering with minimum 48x48px touch targets for mobile ergonomics.

---

## Game Lineup & Rollout Plan

1. **Nine Men's Morris:** 24-point graph, placement/sliding/flying, 16 mill lines (Baseline).
2. **English Checkers:** 8x8 checkerboard, diagonal slides, mandatory multi-jumps, king crowning.
3. **Connect Four:** 7x6 gravity grid, vertical column drops, 4-in-a-row alignment.
4. **Reversi (Othello):** 8x8 grid, ray-based flanking captures, disc flips.

---

## Difficulty Scaling (Levels 1–5)

| Level | Name | Search Depth | Heuristics & Behavior |
| :--- | :--- | :--- | :--- |
| **1** | Beginner | 1-ply | 35% blunder factor; $\epsilon=60$ candidate pool. |
| **2** | Easy | 2-ply | Blocks direct 1-move threats; $\epsilon=30$ candidate pool with softmax selection. |
| **3** | Medium | 4-ply | Considers mobility, positional graph values, and threat configurations; $\epsilon=12$. |
| **4** | Hard | 6-ply | Deep iterative deepening with sharp positional heuristics; $\epsilon=4$. |
| **5** | Master | 8-ply+ | Full Alpha-Beta + transposition cache; $\epsilon=0$ (pure uniform random over strictly optimal ties). |

---

## Development Workflow Commands

```bash
# Start local dev server
npm run dev

# Run all unit, engine, and platform tests
npm test

# Type-check and production build
npm run build

# Preview production build locally
npm run preview
```
