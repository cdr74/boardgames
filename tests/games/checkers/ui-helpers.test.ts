import { describe, expect, it } from 'vitest';
import { createInitialCheckersState } from '../../../src/games/checkers';
import { formatStatusMessage, getPlayerColorName } from '../../../src/games/checkers/ui/ui-helpers';

describe('Checkers UI Helpers (ADR-0007 / TASK-206)', () => {
  it('maps player numbers to color names accurately', () => {
    expect(getPlayerColorName(1)).toBe('Black');
    expect(getPlayerColorName(2)).toBe('White');
  });

  it('formats status messages during human and engine turns', () => {
    const state = createInitialCheckersState();

    // Human turn (Black)
    const humanMsg = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isEngineThinking: false,
    });
    expect(humanMsg).toContain('Your Turn (Black)');

    // Human turn with mandatory jump
    const jumpMsg = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isEngineThinking: false,
      hasMandatoryJump: true,
    });
    expect(jumpMsg).toContain('Mandatory jump available!');

    // Engine thinking
    const thinkingMsg = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 4,
      isEngineThinking: true,
    });
    expect(thinkingMsg).toBe('Engine thinking (Level 4)...');

    // Engine turn
    state.turn = 2;
    const oppTurnMsg = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isEngineThinking: false,
    });
    expect(oppTurnMsg).toContain("Engine's turn (White)...");
  });

  it('formats terminal win/loss/draw messages', () => {
    const state = createInitialCheckersState();

    // Victory
    state.winner = 1;
    state.winReason = 'pieces';
    expect(formatStatusMessage({ state, humanPlayer: 1, difficulty: 3, isEngineThinking: false })).toContain(
      'Victory!'
    );

    // Defeat
    state.winner = 2;
    state.winReason = 'trapped';
    expect(formatStatusMessage({ state, humanPlayer: 1, difficulty: 3, isEngineThinking: false })).toContain(
      'Defeat'
    );

    // Draw 40-move
    state.winner = 'draw';
    state.winReason = 'forty_move_rule';
    expect(formatStatusMessage({ state, humanPlayer: 1, difficulty: 3, isEngineThinking: false })).toContain(
      'Draw by 40-Move Rule'
    );

    // Draw repetition
    state.winReason = 'repetition';
    expect(formatStatusMessage({ state, humanPlayer: 1, difficulty: 3, isEngineThinking: false })).toContain(
      'Draw by Threefold Repetition'
    );
  });
});
