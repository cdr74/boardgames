import { DifficultyLevel, Player } from '../../../platform/types';
import { CheckersState } from '../types';

export function getPlayerColorName(player: Player): string {
  return player === 1 ? 'Black' : 'White';
}

export interface StatusFormatOptions {
  state: CheckersState;
  humanPlayer: Player;
  difficulty: DifficultyLevel;
  isEngineThinking: boolean;
  hasMandatoryJump?: boolean;
}

export function formatStatusMessage(options: StatusFormatOptions): string {
  const { state, humanPlayer, difficulty, isEngineThinking, hasMandatoryJump } = options;

  if (state.winner !== null) {
    if (state.winner === 'draw') {
      return state.winReason === 'repetition'
        ? 'Game Over: Draw by Threefold Repetition'
        : 'Game Over: Draw by 40-Move Rule';
    }
    if (state.winner === humanPlayer) {
      return `Victory! You won by ${
        state.winReason === 'trapped' ? 'trapping all opponent pieces' : 'capturing all pieces'
      }.`;
    }
    return `Defeat: Engine won by ${
      state.winReason === 'trapped' ? 'trapping your pieces' : 'capturing all pieces'
    }.`;
  }

  if (isEngineThinking) {
    return `Engine thinking (Level ${difficulty})...`;
  }

  if (state.turn === humanPlayer) {
    const color = getPlayerColorName(humanPlayer);
    if (hasMandatoryJump) {
      return `Your Turn (${color}) — Mandatory jump available!`;
    }
    return `Your Turn (${color}) — Select a piece to move`;
  }

  const oppColor = getPlayerColorName(state.turn);
  return `Engine's turn (${oppColor})...`;
}
