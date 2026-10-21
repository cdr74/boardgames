import { describe, expect, it } from 'vitest';
import { createInitialConnectFourState } from '../../../src/games/connect-four/board';
import { formatStatusMessage, getPlayerColorName } from '../../../src/games/connect-four/ui/ui-helpers';

describe('Connect Four - UI Helpers', () => {
  it('maps player numbers to color names', () => {
    expect(getPlayerColorName(1)).toBe('Red');
    expect(getPlayerColorName(2)).toBe('Yellow');
  });

  it('formats status message during human turn', () => {
    const state = createInitialConnectFourState();
    const msg = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isEngineThinking: false,
    });
    expect(msg).toBe('Your Turn (Red) — Tap a column to drop');
  });

  it('formats status message during engine thinking', () => {
    const state = createInitialConnectFourState();
    state.turn = 2;
    const msg = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 4,
      isEngineThinking: true,
    });
    expect(msg).toBe('Yellow thinking (Level 4)...');
  });

  it('formats status message on victory and defeat', () => {
    const state = createInitialConnectFourState();
    state.winner = 1;
    state.winReason = 'connect4';

    const winMsg = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isEngineThinking: false,
    });
    expect(winMsg).toBe('Victory! You connected four discs!');

    const defeatMsg = formatStatusMessage({
      state,
      humanPlayer: 2,
      difficulty: 3,
      isEngineThinking: false,
    });
    expect(defeatMsg).toBe('Defeat: Engine (Red) connected four discs!');
  });

  it('formats status message on board draw', () => {
    const state = createInitialConnectFourState();
    state.winner = 'draw';
    state.winReason = 'board_full';

    const msg = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isEngineThinking: false,
    });
    expect(msg).toBe('Game Over: Draw (Board is full)');
  });
});
