import { DifficultyLevel, EngineSearchOptions } from '../types';

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, EngineSearchOptions> = {
  1: {
    difficulty: 1,
    maxDepth: 1,
    timeLimitMs: 500,
    epsilon: 60,
    temperature: 25,
    blunderRate: 0.35,
  },
  2: {
    difficulty: 2,
    maxDepth: 2,
    timeLimitMs: 800,
    epsilon: 30,
    temperature: 20,
    blunderRate: 0,
  },
  3: {
    difficulty: 3,
    maxDepth: 4,
    timeLimitMs: 1500,
    epsilon: 12,
    temperature: 10,
    blunderRate: 0,
  },
  4: {
    difficulty: 4,
    maxDepth: 6,
    timeLimitMs: 2500,
    epsilon: 4,
    temperature: 4,
    blunderRate: 0,
  },
  5: {
    difficulty: 5,
    maxDepth: 8,
    timeLimitMs: 4000,
    epsilon: 0,
    temperature: 1,
    blunderRate: 0,
  },
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, { name: string; description: string }> = {
  1: { name: 'Beginner', description: 'Occasional blunders (35%), exploratory candidate pooling' },
  2: { name: 'Easy', description: 'Blocks direct threats, wide candidate pool with softmax selection' },
  3: { name: 'Medium', description: 'Considers mobility, positional graph values, and threat configurations' },
  4: { name: 'Hard', description: 'Deep iterative deepening with sharp positional heuristics' },
  5: { name: 'Master', description: 'Full Alpha-Beta optimality with stochastic tie-breaking' },
};
