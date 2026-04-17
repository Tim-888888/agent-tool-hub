/**
 * Concurrency limiter for rate-limited APIs.
 *
 * Ensures at most `maxConcurrent` promises execute simultaneously.
 * Queues excess calls and dispatches them in FIFO order as slots free up.
 */

export class ConcurrencyLimiter {
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(private maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      this.queue.shift?.();
    }
  }
}
