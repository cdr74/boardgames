import { DifficultyLevel, EngineSearchOptions } from '../types';

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, EngineSearchOptions> = {
  1: {
    difficulty: 1,
    maxDepth: 1,
    timeLimitMs: 500,
    epsilon: 60,
    temperature: 25,
  },
  2: {
    difficulty: 2,
    maxDepth: 2,
    timeLimitMs: 800,
    epsilon: 30,
    temperature: 20,
  },
  3: {
    difficulty: 3,
    maxDepth: 4,
    timeLimitMs: 1500,
    epsilon: 12,
    temperature: 10,
  },
  4: {
    difficulty: 4,
    maxDepth: 6,
    timeLimitMs: 2500,
    epsilon: 4,
    temperature: 4,
  },
  5: {
    difficulty: 5,
    maxDepth: 8,
    timeLimitMs: 4000,
    epsilon: 0,
    temperature: 1,
  },
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, { name: string; description: string }> = {
  1: { name: 'Beginner', description: 'Occasional blunders, exploratory candidate pooling' },
  2: { name: 'Easy', description: 'Blocks direct threats, simple 2-ply tactical search' },
  3: { name: 'Medium', description: 'Considers mobility, positional graph value & 2-piece threats' },
  4: { name: 'Hard', description: 'Deep iterative deepening with sharp positional play' },
  5: { name: 'Master', description: 'Full Alpha-Beta optimality with stochastic tie-breaking' },
};
