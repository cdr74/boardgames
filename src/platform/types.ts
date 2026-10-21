export type Player = 1 | 2;

export interface GameOverResult {
  isOver: boolean;
  winner: Player | null; // null represents draw or not over
  reason?: string;
}

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface EngineSearchOptions {
  difficulty?: DifficultyLevel;
  maxDepth: number;
  timeLimitMs?: number;
  temperature?: number;
  epsilon?: number;
  deterministic?: boolean;
  blunderRate?: number;
}

export interface EngineResult<TMove> {
  bestMove: TMove;
  score: number;
  depthReached: number;
  nodesEvaluated: number;
  timeSpentMs: number;
}

export interface IGameDefinition<TState, TMove> {
  readonly id: string;
  readonly name: string;
  getInitialState(): TState;
  getCurrentPlayer(state: TState): Player;
  getLegalMoves(state: TState): TMove[];
  applyMove(state: TState, move: TMove): TState;
  evaluateState(state: TState, perspectivePlayer: Player, difficulty?: DifficultyLevel): number;
  serializeState(state: TState): string;
  checkGameOver(state: TState): GameOverResult;
  orderMoves?(moves: TMove[], state: TState, deterministic?: boolean): TMove[];
  isTacticalMove?(move: TMove, state: TState): boolean;
  getDifficultyConfig?(level: DifficultyLevel): Partial<EngineSearchOptions>;
}
