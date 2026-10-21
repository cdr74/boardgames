import { DifficultyLevel, Player } from '../../../platform/types';
import { ReversiState } from '../types';

export function getPlayerColorName(player: Player): 'Black' | 'White' {
  return player === 1 ? 'Black' : 'White';
}

export interface StatusFormatOptions {
  state: ReversiState;
  humanPlayer: Player;
  difficulty: DifficultyLevel;
  isEngineThinking: boolean;
}

export function formatStatusMessage(options: StatusFormatOptions): string {
  const { state, humanPlayer, difficulty, isEngineThinking } = options;
  const myDiscs = humanPlayer === 1 ? state.blackCount : state.whiteCount;
  const oppDiscs = humanPlayer === 1 ? state.whiteCount : state.blackCount;

  if (state.winner !== null) {
    if (state.winner === 'draw') {
      return `Game Over: Draw (${state.blackCount} - ${state.whiteCount})`;
    }
    if (state.winner === humanPlayer) {
      if (state.winReason === 'wipeout') {
        return 'Victory! You wiped out all opponent discs!';
      }
      return `Victory! You won ${myDiscs} to ${oppDiscs} discs!`;
    }
    const winnerColor = getPlayerColorName(state.winner);
    if (state.winReason === 'wipeout') {
      return `Defeat: Engine (${winnerColor}) wiped out all your discs!`;
    }
    return `Defeat: Engine (${winnerColor}) won ${oppDiscs} to ${myDiscs} discs!`;
  }

  const scoreInfo = `⚫ ${state.blackCount} · ⚪ ${state.whiteCount}`;

  if (isEngineThinking) {
    const aiColor = getPlayerColorName(state.turn);
    return `${aiColor} thinking (Level ${difficulty})... (${scoreInfo})`;
  }

  if (state.isPass) {
    const passedPlayer = state.turn === 1 ? 'White' : 'Black';
    return `${passedPlayer} has no legal moves (Passed). Your Turn! (${scoreInfo})`;
  }

  if (state.turn === humanPlayer) {
    const color = getPlayerColorName(humanPlayer);
    return `Your Turn (${color}) — Select a square to place (${scoreInfo})`;
  }

  const oppColor = getPlayerColorName(state.turn);
  return `Engine's turn (${oppColor})... (${scoreInfo})`;
}
