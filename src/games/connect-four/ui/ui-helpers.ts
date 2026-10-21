import { DifficultyLevel, Player } from '../../../platform/types';
import { ConnectFourState } from '../types';

export function getPlayerColorName(player: Player): 'Red' | 'Yellow' {
  return player === 1 ? 'Red' : 'Yellow';
}

export interface StatusFormatOptions {
  state: ConnectFourState;
  humanPlayer: Player;
  difficulty: DifficultyLevel;
  isEngineThinking: boolean;
}

export function formatStatusMessage(options: StatusFormatOptions): string {
  const { state, humanPlayer, difficulty, isEngineThinking } = options;

  if (state.winner !== null) {
    if (state.winner === 'draw') {
      return 'Game Over: Draw (Board is full)';
    }
    if (state.winner === humanPlayer) {
      return 'Victory! You connected four discs!';
    }
    const winnerColor = getPlayerColorName(state.winner);
    return `Defeat: Engine (${winnerColor}) connected four discs!`;
  }

  if (isEngineThinking) {
    const aiColor = getPlayerColorName(state.turn);
    return `${aiColor} thinking (Level ${difficulty})...`;
  }

  if (state.turn === humanPlayer) {
    const color = getPlayerColorName(humanPlayer);
    return `Your Turn (${color}) — Tap a column to drop`;
  }

  const oppColor = getPlayerColorName(state.turn);
  return `${oppColor}'s turn (Engine)...`;
}
