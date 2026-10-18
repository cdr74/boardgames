# ADR-0004: Startup Game Lobby Menu and Session Lifecycle

* **Status:** Accepted
* **Date:** 2026-10-18
* **Deciders:** cdr74, Engineering Team

---

## Context
In a multi-game platform, user expectations require a clear, intuitive entrypoint where players select their desired game rather than launching immediately into a default board.

## Decision
1. **Startup Game Lobby:** On initial launch, the application displays the **Game Selection Menu** (`src/shell/lobby.ts`), showing the list of available games with titles, descriptions, and "Play" buttons.
2. **Persistent Navigation:** A top navigation control ("Games Menu" / "Switch Game") allows returning to the Game Lobby at any time during an active match.
3. **Universal Session Management:** When a game is selected, the `GameSessionManager` boots the selected game module, mounts its SVG board, and starts the alternating turn cycle.

## Rationale
- Immediate clarity: Users understand that this is a multi-game platform rather than a single-purpose game app.
- Scalable: Adding new games (Checkers, Connect Four, Reversi) automatically populates the menu.

## Consequences
- **Positive:** Clear platform user experience and seamless game transitions.
- **Negative:** Requires state cleanup when switching between active games to terminate in-flight worker searches.
