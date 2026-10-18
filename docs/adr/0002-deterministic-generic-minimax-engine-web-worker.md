# ADR-0002: Generic Deterministic Minimax Engine via Web Worker

* **Status:** Accepted
* **Date:** 2026-10-18
* **Deciders:** cdr74, Engineering Team

---

## Context
All games in the platform are 2-player zero-sum deterministic strategy games. The on-device engine must execute calculations up to 8+ ply depth without causing UI frame drops or blocking user interactions.

## Decision
We implement a **Generic Minimax Engine (`GenericMinimaxEngine<TState, TMove>`)** running in a dedicated local Web Worker thread (`src/platform/engine/worker.ts`), communicating via asynchronous message passing (`EngineClient`).

## Rationale
- **60fps UI Guarantee:** Offloading Negamax, Alpha-Beta pruning, and iterative deepening to a background Web Worker ensures the UI thread remains 100% responsive.
- **Universal Reusability:** The search engine is parameterized over `IGameDefinition<TState, TMove>`, allowing Morris, Checkers, Connect Four, and Reversi to share the exact same battle-tested search pipeline.
- **Offline & Private:** All calculations occur strictly on-device with zero remote API dependencies.

## Consequences
- **Positive:** Uncompromised search performance with smooth touch responsiveness.
- **Negative:** Asynchronous message passing requires serializable state payloads and typed request/response bridges.
