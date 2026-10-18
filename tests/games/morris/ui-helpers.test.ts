import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../../src/games/morris/board';
import { formatStatusMessage, getOpponent } from '../../../src/games/morris/ui/ui-helpers';

describe('UI Helpers & Status Message Formatting', () => {
  it('identifies opponent correctly', () => {
    expect(getOpponent(1)).toBe(2);
    expect(getOpponent(2)).toBe(1);
  });

  it('formats placement phase status with both piece counts in hand', () => {
    const state = createInitialGameState();
    const message = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isPendingCapture: false,
      isEngineThinking: false,
    });

    expect(message).toContain('White to Place');
    expect(message).toContain('⚪ 9');
    expect(message).toContain('⚫ 9');
    expect(message).toContain('in hand');
  });

  it('formats status when engine is thinking', () => {
    const state = createInitialGameState();
    state.turn = 2;
    const message = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isPendingCapture: false,
      isEngineThinking: true,
    });

    expect(message).toBe('Black (Level 3 - Medium) is thinking...');
  });

  it('formats status when engine White is thinking if player is Black', () => {
    const state = createInitialGameState();
    state.turn = 1;
    const message = formatStatusMessage({
      state,
      humanPlayer: 2,
      difficulty: 4,
      isPendingCapture: false,
      isEngineThinking: true,
    });

    expect(message).toBe('White (Level 4 - Hard) is thinking...');
  });

  it('formats mill formed pending capture message', () => {
    const state = createInitialGameState();
    const message = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isPendingCapture: true,
      isEngineThinking: false,
    });

    expect(message).toBe('Mill formed! Choose a black piece to capture');
  });

  it('formats mill formed pending capture for player Black', () => {
    const state = createInitialGameState();
    state.turn = 2;
    const message = formatStatusMessage({
      state,
      humanPlayer: 2,
      difficulty: 3,
      isPendingCapture: true,
      isEngineThinking: false,
    });

    expect(message).toBe('Mill formed! Choose a white piece to capture');
  });

  it('formats movement phase status with pieces on board', () => {
    const state = createInitialGameState();
    state.whitePiecesInHand = 0;
    state.blackPiecesInHand = 0;
    state.whitePiecesOnBoard = 7;
    state.blackPiecesOnBoard = 6;
    state.turn = 1;

    const message = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isPendingCapture: false,
      isEngineThinking: false,
    });

    expect(message).toContain("White's Turn: Slide");
    expect(message).toContain('⚪ 7');
    expect(message).toContain('⚫ 6');
  });

  it('formats flying phase status correctly', () => {
    const state = createInitialGameState();
    state.whitePiecesInHand = 0;
    state.blackPiecesInHand = 0;
    state.whitePiecesOnBoard = 3;
    state.blackPiecesOnBoard = 5;
    state.turn = 1;

    const message = formatStatusMessage({
      state,
      humanPlayer: 1,
      difficulty: 3,
      isPendingCapture: false,
      isEngineThinking: false,
    });

    expect(message).toContain("White's Turn: Flying (Jump anywhere)");
    expect(message).toContain('⚪ 3');
    expect(message).toContain('⚫ 5');
  });
});
