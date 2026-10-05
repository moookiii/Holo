/** Bound native image decodes across all preview jobs. Canceled queued reads
 * leave immediately so scrolling cannot accumulate obsolete work. */
export class PreviewReadQueue {
  private active = 0;
  private pending: (() => void)[] = [];
  private readonly capacity: number;
  constructor(capacity = 6) { this.capacity = capacity; }
  run<T>(signal: AbortSignal, task: () => Promise<T>): Promise<T> {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      const cancel = () => {
        const index = this.pending.indexOf(start);
        if (index >= 0) this.pending.splice(index, 1);
        reject(signal.reason);
      };
      const start = () => {
        signal.removeEventListener('abort', cancel); this.active++;
        void Promise.resolve().then(() => { signal.throwIfAborted(); return task(); }).then(resolve, reject).finally(() => {
          this.active--;
          while (this.active < this.capacity && this.pending.length) this.pending.shift()!();
        });
      };
      if (this.active < this.capacity) start();
      else { this.pending.push(start); signal.addEventListener('abort', cancel, { once: true }); }
    });
  }
}
