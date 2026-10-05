/** Driver compilation can overlap while node graphs still build one at a time.
 * Observe failures immediately and wait for every pipeline before presentation. */
export class PipelineCompletionBatch {
  private pending: Promise<PromiseSettledResult<unknown>>[] = [];
  add(promises: Promise<unknown>[]) {
    for (const promise of promises) this.pending.push(promise.then(
      value => ({ status: 'fulfilled' as const, value }),
      reason => ({ status: 'rejected' as const, reason }),
    ));
  }
  async finish() {
    const results = await Promise.all(this.pending);
    const failed = results.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  }
}
