import { EngineResult, EngineSearchOptions } from '../types';
import { WorkerSearchRequest, WorkerSearchResponse } from './worker';

export class EngineClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (result: EngineResult<any>) => void;
      reject: (error: Error) => void;
    }
  >();
  private requestIdCounter = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (event: MessageEvent<WorkerSearchResponse>) => {
        const { id, result } = event.data;
        const pending = this.pendingRequests.get(id);
        if (pending) {
          pending.resolve(result);
          this.pendingRequests.delete(id);
        }
      };

      this.worker.onerror = (error) => {
        console.error('Engine Worker error:', error);
      };
    }
  }

  public async search<TState, TMove>(
    gameId: string,
    state: TState,
    options: EngineSearchOptions
  ): Promise<EngineResult<TMove>> {
    if (!this.worker) {
      throw new Error('Web Worker not supported in this environment');
    }

    const id = `req_${++this.requestIdCounter}`;

    return new Promise<EngineResult<TMove>>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const request: WorkerSearchRequest = {
        type: 'SEARCH',
        id,
        gameId,
        state,
        options,
      };

      this.worker!.postMessage(request);
    });
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}
