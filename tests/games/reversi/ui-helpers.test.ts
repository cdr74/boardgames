import { describe, expect, it } from 'vitest';
import { createInitialReversiState } from '../../../src/games/reversi/board';
import { formatStatusMessage, getPlayerColorName } from '../../../src/games/reversi/ui/ui-helpers';

describe('Reversi - UI Helpers', () => {
  it('maps player numbers to color names', () => {
    expect(getPlayerColorName(1)).toBe('Black');
    expect(getPlayerColorName(2)).toBe('White');
  });

  it('formats status message on human turn with disc counts', () => {
    const state = createInitialReversiState();
    const msg = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isEngineThinking: false,
    });
    expect(msg).toBe('Your Turn (Black) — Select a square to place (⚫ 2 · ⚪ 2)');
  });

  it('formats status message when pass occurs', () => {
    const state = createInitialReversiState();
    state.isPass = true;
    state.turn = 1; // Black's turn after White passed
    const msg = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isEngineThinking: false,
    });
    expect(msg).toContain('White has no legal moves (Passed)');
  });

  it('formats status message on victory, defeat, and wipeout', () => {
    const winState = createInitialReversiState();
    winState.winner = 1;
    winState.blackCount = 42;
    winState.whiteCount = 22;

    const winMsg = formatStatusMessage({
      state: winState,
      humanPlayer: 1,
      difficulty: 3,
      isEngineThinking: false,
    });
    expect(winMsg).toBe('Victory! You won 42 to 22 discs!');

    const wipeoutState = createInitialReversiState();
    wipeoutState.winner = 1;
    wipeoutState.winReason = 'wipeout';
    wipeoutState.blackCount = 12;
    wipeoutState.whiteCount = 0;

    const wipeoutMsg = formatStatusMessage({
      state: wipeoutState,
      humanPlayer: 1,
      difficulty: 3,
      isEngineThinking: false,
    });
    expect(wipeoutMsg).toBe('Victory! You wiped out all opponent discs!');
  });
});
