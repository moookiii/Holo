export function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

/** Latest selection owns the result, including after an uncancellable decode. */
export class SelectionTask {
  private controller?: AbortController;
  begin() { this.cancel(); return this.controller = new AbortController(); }
  current(request: AbortController) { return this.controller === request && !request.signal.aborted; }
  cancel() { this.controller?.abort(); this.controller = undefined; }
}

export async function boundedMap<T, U>(items: readonly T[], limit: number, signal: AbortSignal, fn: (item: T) => Promise<U>): Promise<U[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid concurrency');
  const result = new Array<U>(items.length); let cursor = 0; let failed = false;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (!failed) {
      signal.throwIfAborted(); const index = cursor++; if (index >= items.length) return;
      try { result[index] = await fn(items[index]); signal.throwIfAborted(); }
      catch (error) { failed = true; throw error; }
    }
  });
  const outcomes = await Promise.allSettled(workers);
  const failure = outcomes.find(outcome => outcome.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
  signal.throwIfAborted(); return result;
}
