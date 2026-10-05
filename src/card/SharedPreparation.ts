/** An abort belongs to a consumer, not to another consumer's shared job. */
export class SharedPreparation<T> {
  private jobs = new Map<string, { controller: AbortController; promise: Promise<T>; users: number }>();
  hits = 0;
  run(key: string, signal: AbortSignal, prepare: (signal: AbortSignal) => Promise<T>): Promise<T> {
    signal.throwIfAborted();
    let job = this.jobs.get(key);
    if (job) this.hits++;
    else {
      const controller = new AbortController();
      job = { controller, users: 0, promise: Promise.resolve().then(() => prepare(controller.signal)) };
      this.jobs.set(key, job);
      const created = job;
      void job.promise.finally(() => { if (this.jobs.get(key) === created) this.jobs.delete(key); }).catch(() => {});
    }
    const shared = job; shared.users++;
    return new Promise<T>((resolve, reject) => {
      let finished = false;
      const finish = () => {
        if (finished) return false;
        finished = true; signal.removeEventListener('abort', abort);
        if (--shared.users === 0 && this.jobs.get(key) === shared) {
          this.jobs.delete(key); shared.controller.abort();
        }
        return true;
      };
      const abort = () => { if (finish()) reject(signal.reason); };
      signal.addEventListener('abort', abort, { once: true });
      shared.promise.then(value => { if (finish()) resolve(value); }, error => { if (finish()) reject(error); });
    });
  }
}
