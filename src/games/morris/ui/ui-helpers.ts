import { getPlayerPhase } from '../board';
import { GameState, Player } from '../types';
import { DIFFICULTY_LABELS } from '../../../platform/engine/difficulty';
import { DifficultyLevel } from '../../../platform/types';

export function getOpponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}

export function getPlayerColorName(player: Player): 'White' | 'Black' {
  return player === 1 ? 'White' : 'Black';
}

export interface StatusMessageParams {
  state: GameState;
  humanPlayer: Player;
  difficulty: DifficultyLevel;
  isPendingCapture: boolean;
  isEngineThinking: boolean;
}

export function formatStatusMessage({
  state,
  difficulty,
  isPendingCapture,
  isEngineThinking,
}: StatusMessageParams): string {
  const currentTurn = state.turn;
  const turnName = getPlayerColorName(currentTurn);
  const opponent = getOpponent(currentTurn);
  const opponentName = getPlayerColorName(opponent);
  const diffName = DIFFICULTY_LABELS[difficulty]?.name ?? 'Medium';

  // 1. Pending capture state
  if (isPendingCapture) {
    const targetName = opponentName.toLowerCase();
    return `Mill formed! Choose a ${targetName} piece to capture`;
  }

  // 2. Engine calculating
  if (isEngineThinking) {
    return `${turnName} (Level ${difficulty} - ${diffName}) is thinking...`;
  }

  // 3. Game phase check
  const phase = getPlayerPhase(state, currentTurn);

  if (phase === 'placement') {
    const inHandInfo = `⚪ ${state.whitePiecesInHand} · ⚫ ${state.blackPiecesInHand} in hand`;
    return `${turnName} to Place (${inHandInfo})`;
  }

  // Movement or Flying phase
  const onBoardInfo = `⚪ ${state.whitePiecesOnBoard} · ⚫ ${state.blackPiecesOnBoard}`;
  if (phase === 'flying') {
    return `${turnName}'s Turn: Flying (Jump anywhere) (${onBoardInfo})`;
  }

  return `${turnName}'s Turn: Slide (${onBoardInfo})`;
}
