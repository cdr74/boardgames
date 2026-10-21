import { checkersGameDefinition } from './checkers';
import { connectFourGameDefinition } from './connect-four';
import { morrisGameDefinition } from './morris';
import { IGameDefinition } from '../platform/types';

export interface GameMetadata {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  status: 'playable' | 'in-development' | 'planned';
  definition?: IGameDefinition<any, any>;
  badgeText?: string;
}

export const GAME_REGISTRY: GameMetadata[] = [
  {
    id: 'nine-mens-morris',
    name: "Nine Men's Morris",
    subtitle: 'Mühlespiel • 3 Concentric Squares',
    description: 'Classic alignment game. Place and slide 9 pieces to form mills (3-in-a-row) and capture opponent pieces.',
    status: 'playable',
    definition: morrisGameDefinition,
  },
  {
    id: 'checkers',
    name: 'English Checkers',
    subtitle: 'Draughts • 8x8 Board',
    description: 'Diagonal jumping game. Mandatory captures, multi-jumps, and king crowning on the opponent back rank.',
    status: 'playable',
    definition: checkersGameDefinition,
  },
  {
    id: 'connect-four',
    name: 'Connect Four',
    subtitle: 'Vertical Drop • 7x6 Grid',
    description: 'Gravity-drop alignment game. First player to connect four checkers horizontally, vertically, or diagonally wins.',
    status: 'playable',
    definition: connectFourGameDefinition,
  },
  {
    id: 'reversi',
    name: 'Reversi',
    subtitle: 'Othello • 8x8 Territory Flanking',
    description: 'Dynamic disc-flipping territory game. Trap opponent pieces between your discs to flip them to your color.',
    status: 'planned',
    badgeText: 'Milestone 4',
  },
];
