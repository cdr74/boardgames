import { checkersGameDefinition } from '../../games/checkers';
import { morrisGameDefinition } from '../../games/morris';
import { GenericMinimaxEngine } from '../engine/minimax';
import { EngineSearchOptions, IGameDefinition } from '../types';

const engines = new Map<string, GenericMinimaxEngine<any, any>>();

function getEngine(gameId: string): GenericMinimaxEngine<any, any> {
  let engine = engines.get(gameId);
  if (!engine) {
    let definition: IGameDefinition<any, any>;
    if (gameId === 'nine-mens-morris') {
      definition = morrisGameDefinition;
    } else if (gameId === 'checkers') {
      definition = checkersGameDefinition;
    } else {
      throw new Error(`Unknown game: ${gameId}`);
    }
    engine = new GenericMinimaxEngine(definition);
    engines.set(gameId, engine);
  }
  return engine;
}

export interface WorkerSearchRequest {
  type: 'SEARCH';
  id: string;
  gameId: string;
  state: any;
  options: EngineSearchOptions;
}

export interface WorkerSearchResponse {
  type: 'SEARCH_COMPLETE';
  id: string;
  result: any;
}

self.onmessage = (event: MessageEvent<WorkerSearchRequest>) => {
  const { type, id, gameId, state, options } = event.data;

  if (type === 'SEARCH') {
    const engine = getEngine(gameId);
    const result = engine.search(state, options);

    const response: WorkerSearchResponse = {
      type: 'SEARCH_COMPLETE',
      id,
      result,
    };

    self.postMessage(response);
  }
};
