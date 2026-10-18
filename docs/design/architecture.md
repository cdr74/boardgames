# System Design Document: Classic Board Games Platform

## 1. System Overview & Problem Statement

The **Classic Board Games Platform** is an offline-first, deterministic, responsive web and mobile application supporting classic 2-player turn-based strategy board games:
- Nine Men's Morris (*Mühlespiel*)
- English Checkers (*Draughts*)
- Connect Four
- Reversi (*Othello*)

All games share common attributes:
1. Two-player zero-sum games with alternating turns.
2. Complete information (no hidden cards or fog of war).
3. Deterministic rules without stochastic dice rolls (replayability is driven by candidate pooling and varied opening heuristics).

---

## 2. Core Architecture & Layered Boundaries

```mermaid
flowchart TD
    subgraph UI ["Presentation & Shell (src/shell/)"]
        App["App Controller (main.ts)"]
        Lobby["Game Lobby Menu (lobby.ts)"]
        HUD["Universal HUD & Controls (hud.ts)"]
        Session["Session Manager (session.ts)"]
    end

    subgraph Core ["Platform Core (src/platform/)"]
        Contract["IGameDefinition<TState, TMove>"]
        Engine["GenericMinimaxEngine<TState, TMove>"]
        WorkerBridge["EngineClient & Worker Bridge"]
        DiffConfig["Difficulty Configuration (Levels 1-5)"]
    end

    subgraph Games ["Game Registry (src/games/)"]
        Registry["Game Registry (registry.ts)"]
        Morris["games/morris/"]
        Checkers["games/checkers/"]
        ConnectFour["games/connect-four/"]
        Reversi["games/reversi/"]
    end

    App --> Lobby
    Lobby --> Registry
    Lobby --> Session
    Session --> HUD
    Session --> Contract
    Registry --> Morris
    Registry --> Checkers
    Registry --> ConnectFour
    Registry --> Reversi
    Morris --> Contract
    Checkers --> Contract
    ConnectFour --> Contract
    Reversi --> Contract
    Contract --> Engine
    Contract --> WorkerBridge
    DiffConfig --> Engine
```

---

## 3. Component Specifications

### 3.1 Platform Core (`src/platform/`)
* **`IGameDefinition<TState, TMove>`:**
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
* **`GenericMinimaxEngine<TState, TMove>`:**
  Universal search engine implementing:
  - Iterative Deepening within dynamic time budgets.
  - Negamax with Alpha-Beta pruning ($O(b^{d/2})$ complexity).
  - Transposition caching with depth verification.
  - Difficulty-scaled $\epsilon$-candidate pooling and Boltzmann/uniform sampling (eliminating deterministic repetition).
  - Immediate tactical capture prioritization.

### 3.2 Shell & Lifecycle (`src/shell/`)
* **Startup Game Lobby (`lobby.ts`):**
  Renders the initial menu list of available games. Players select a game to begin a match or switch games at any time.
* **Game Session Manager (`session.ts`):**
  Manages match lifecycle:
  - Current state and move history stack for full Undo/Redo capability.
  - Alternating turn manager (Human vs On-Device Engine).
  - Move pacing delay for natural human perception of computer moves.
  - Game Over victory, defeat, and draw dialogs.

---

## 4. Startup & Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Shell as App Shell (main.ts)
    participant Lobby as Game Lobby Menu
    participant Session as Session Manager
    participant Game as IGameDefinition
    participant Worker as Engine Web Worker

    User->>Shell: Open App
    Shell->>Lobby: Render Game Menu List
    User->>Lobby: Select Game (e.g., Nine Men's Morris)
    Lobby->>Session: Start Match(gameId, playerColor, difficulty)
    Session->>Game: getInitialState()
    Session->>Shell: Mount Responsive SVG Board
    
    loop Turn Loop
        alt Human Turn
            User->>Shell: Touch / Click Move
            Shell->>Session: Execute Move
            Session->>Game: applyMove(state, move)
        else Computer Turn
            Session->>Worker: postMessage(SEARCH, state, difficulty)
            Worker->>Worker: GenericMinimaxEngine.search()
            Worker-->>Session: postMessage(SEARCH_COMPLETE, bestMove)
            Session->>Game: applyMove(state, bestMove)
        end
        Session->>Game: checkGameOver(state)
    end
```
