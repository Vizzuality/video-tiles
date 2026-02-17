/**
 * Simple semaphore to limit concurrent decode operations.
 * Prevents browser resource exhaustion when many tiles load at once.
 */

const MAX_CONCURRENT_DECODES = 8;

export class DecodeQueue {
  private _concurrency: number;
  private _running = 0;
  private _waiting: (() => void)[] = [];

  constructor(concurrency: number) {
    this._concurrency = concurrency;
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    await this._acquire();
    try {
      return await fn();
    } finally {
      this._release();
    }
  }

  private _acquire(): Promise<void> {
    if (this._running < this._concurrency) {
      this._running++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this._waiting.push(resolve));
  }

  private _release(): void {
    const next = this._waiting.shift();
    if (next) {
      next();
    } else {
      this._running--;
    }
  }
}

export const decodeQueue = new DecodeQueue(MAX_CONCURRENT_DECODES);
