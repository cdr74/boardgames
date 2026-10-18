import { DIFFICULTY_CONFIGS } from './difficulty';
import { EngineResult, EngineSearchOptions, IGameDefinition, Player } from '../types';

interface TTEntry<TMove> {
  depth: number;
  score: number;
  flag: 'exact' | 'lower' | 'upper';
  bestMove?: TMove;
}

export class GenericMinimaxEngine<TState, TMove> {
  private transpositionTable = new Map<string, TTEntry<TMove>>();
  private nodesEvaluated = 0;
  private startTime = 0;
  private timeLimitMs = 0;
  private stopSearch = false;

  constructor(private readonly game: IGameDefinition<TState, TMove>) {}

  public search(state: TState, options: EngineSearchOptions): EngineResult<TMove> {
    this.nodesEvaluated = 0;
    this.startTime = performance.now();
    this.timeLimitMs = options.timeLimitMs ?? 2000;
    this.stopSearch = false;
    this.transpositionTable.clear();

    const legalMoves = this.game.getLegalMoves(state);
    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    const difficultyConfig = options.difficulty ? DIFFICULTY_CONFIGS[options.difficulty] : undefined;
    const deterministic = options.deterministic ?? false;
    const epsilon = options.epsilon ?? difficultyConfig?.epsilon ?? 0;
    const temperature = options.temperature ?? difficultyConfig?.temperature ?? 10;

    // Special case for Level 1 (Beginner with blunder chance)
    if (options.difficulty === 1 && !deterministic) {
      const isBlunder = Math.random() < 0.35;
      if (isBlunder) {
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        return {
          bestMove: randomMove,
          score: 0,
          depthReached: 1,
          nodesEvaluated: 1,
          timeSpentMs: performance.now() - this.startTime,
        };
      }
    }

    // Move ordering
    const orderedMoves = this.orderMoves(legalMoves, state, deterministic);

    let bestMove = orderedMoves[0];
    let bestScore = -Infinity;
    let depthReached = 1;
    let depthCandidates: { move: TMove; score: number }[] = [];

    const maxDepth = options.maxDepth;
    const player = this.game.getCurrentPlayer(state);

    // Iterative Deepening
    for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
      if (this.isTimeExpired()) break;

      let currentBestMove: TMove | undefined;
      let currentBestScore = -Infinity;
      let alpha = -Infinity;
      const beta = Infinity;
      const currentLevelScores: { move: TMove; score: number }[] = [];

      for (const move of orderedMoves) {
        const nextState = this.game.applyMove(state, move);
        const score = -this.minimax(
          nextState,
          currentDepth - 1,
          -beta,
          -alpha,
          player,
          deterministic
        );

        if (this.stopSearch) break;

        currentLevelScores.push({ move, score });

        if (score > currentBestScore) {
          currentBestScore = score;
          currentBestMove = move;
        }
        alpha = Math.max(alpha, score);
      }

      if (!this.stopSearch && currentBestMove !== undefined) {
        bestMove = currentBestMove;
        bestScore = currentBestScore;
        depthReached = currentDepth;
        depthCandidates = currentLevelScores;
      }

      // Early stop if guaranteed win found
      if (bestScore > 50000) break;
    }

    if (depthCandidates.length > 0 && !deterministic) {
      bestMove = this.selectCandidateMove(
        depthCandidates,
        bestScore,
        epsilon,
        temperature,
        bestMove,
        state
      );
    }

    return {
      bestMove,
      score: bestScore,
      depthReached,
      nodesEvaluated: this.nodesEvaluated,
      timeSpentMs: performance.now() - this.startTime,
    };
  }

  private selectCandidateMove(
    candidates: { move: TMove; score: number }[],
    bestScore: number,
    epsilon: number,
    temperature: number,
    fallbackMove: TMove,
    state: TState
  ): TMove {
    const rawPool = candidates.filter(c => c.score >= bestScore - epsilon);
    if (rawPool.length === 0) {
      return fallbackMove;
    }

    // Tactical moves (such as captures) get strict priority if present in pool
    if (this.game.isTacticalMove) {
      const tacticalInPool = rawPool.filter(c => this.game.isTacticalMove!(c.move, state));
      if (tacticalInPool.length > 0) {
        return this.samplePool(tacticalInPool, epsilon, temperature);
      }
    }

    return this.samplePool(rawPool, epsilon, temperature);
  }

  private samplePool(
    pool: { move: TMove; score: number }[],
    epsilon: number,
    temperature: number
  ): TMove {
    if (pool.length === 1) {
      return pool[0].move;
    }

    if (epsilon <= 0) {
      const poolBestScore = Math.max(...pool.map(c => c.score));
      const optimal = pool.filter(c => c.score === poolBestScore);
      const chosen = optimal[Math.floor(Math.random() * optimal.length)];
      return chosen ? chosen.move : pool[0].move;
    }

    const poolBestScore = Math.max(...pool.map(c => c.score));
    const temp = Math.max(1, temperature);
    const weights: number[] = [];
    let sumWeight = 0;

    for (const item of pool) {
      const w = Math.exp((item.score - poolBestScore) / temp);
      weights.push(w);
      sumWeight += w;
    }

    let r = Math.random() * sumWeight;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        return pool[i].move;
      }
    }

    return pool[0].move;
  }

  private minimax(
    state: TState,
    depth: number,
    alpha: number,
    beta: number,
    rootPlayer: Player,
    deterministic: boolean
  ): number {
    this.nodesEvaluated++;

    if (this.nodesEvaluated % 500 === 0 && this.isTimeExpired()) {
      this.stopSearch = true;
      return 0;
    }

    const gameOver = this.game.checkGameOver(state);
    if (gameOver.isOver || depth <= 0) {
      const currentPlayer = this.game.getCurrentPlayer(state);
      return this.game.evaluateState(state, currentPlayer);
    }

    const stateKey = `${this.game.serializeState(state)}:${depth}`;
    const cached = this.transpositionTable.get(stateKey);
    if (cached && cached.depth >= depth) {
      if (cached.flag === 'exact') return cached.score;
      if (cached.flag === 'lower') alpha = Math.max(alpha, cached.score);
      else if (cached.flag === 'upper') beta = Math.min(beta, cached.score);
      if (alpha >= beta) return cached.score;
    }

    const legalMoves = this.game.getLegalMoves(state);
    if (legalMoves.length === 0) {
      const currentPlayer = this.game.getCurrentPlayer(state);
      return this.game.evaluateState(state, currentPlayer);
    }

    const orderedMoves = this.orderMoves(legalMoves, state, deterministic);
    let maxEval = -Infinity;
    const originalAlpha = alpha;

    for (const move of orderedMoves) {
      const nextState = this.game.applyMove(state, move);
      const evaluation = -this.minimax(
        nextState,
        depth - 1,
        -beta,
        -alpha,
        rootPlayer,
        deterministic
      );

      if (this.stopSearch) return 0;

      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);

      if (alpha >= beta) {
        break; // Beta cutoff
      }
    }

    let flag: 'exact' | 'lower' | 'upper' = 'exact';
    if (maxEval <= originalAlpha) {
      flag = 'upper';
    } else if (maxEval >= beta) {
      flag = 'lower';
    }

    this.transpositionTable.set(stateKey, {
      depth,
      score: maxEval,
      flag,
    });

    return maxEval;
  }

  private orderMoves(moves: TMove[], state: TState, deterministic = false): TMove[] {
    if (this.game.orderMoves) {
      return this.game.orderMoves(moves, state, deterministic);
    }

    const copy = [...moves];
    if (!deterministic) {
      this.shuffle(copy);
    }
    return copy;
  }

  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }

  private isTimeExpired(): boolean {
    if (this.timeLimitMs <= 0) return false;
    return performance.now() - this.startTime >= this.timeLimitMs;
  }
}
