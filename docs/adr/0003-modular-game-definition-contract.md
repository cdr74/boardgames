# ADR-0003: Modular Game Definition Contract (`IGameDefinition`)

* **Status:** Accepted
* **Date:** 2026-10-18
* **Deciders:** cdr74, Engineering Team

---

## Context
To support multiple board games in a unified platform without coupling game rules to engine or UI logic, a strict behavioral contract is required.

## Decision
We define the universal contract **`IGameDefinition<TState, TMove>`** in `src/platform/types.ts`:
```typescript
export interface IGameDefinition<TState, TMove> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  getInitialState(): TState;
  getCurrentPlayer(state: TState): Player;
  getLegalMoves(state: TState): TMove[];
  applyMove(state: TState, move: TMove): TState;
  evaluateState(state: TState, perspectivePlayer: Player): number;
  serializeState(state: TState): string;
  checkGameOver(state: TState): GameOverResult;
  orderMoves?(moves: TMove[], state: TState, deterministic?: boolean): TMove[];
  isTacticalMove?(move: TMove, state: TState): boolean;
}
```

## Rationale
- Each game is an independent plugin module (`src/games/<gameId>/`).
- Adding a new game requires only implementing `IGameDefinition` and its SVG renderer, with zero modifications to the core search engine or session manager.

## Consequences
- **Positive:** Maximum modularity, test isolation, and rapid velocity when adding new games.
- **Negative:** Enforces strict functional purity on `applyMove` (immutable state cloning).
