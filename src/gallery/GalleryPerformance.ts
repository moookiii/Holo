/** Small, bounded diagnostics. Frame intervals describe CPU scheduling and
 * presentation cadence, not GPU execution time or proof of causality. */
export class GalleryPerformance {
  private started = 0;
  private first?: number;
  private ready?: number;
  private frames: number[] = [];
  private previousRealization = false;
  private spikes = 0;
  private realizationSpikes = 0;
  private peakSubmission = 0;
  begin() { this.started = performance.now(); this.first = this.ready = undefined; this.previousRealization = false; }
  frame(intervalMs: number, submissionMs: number, visible: number, expected: number, failed: number, realizing: boolean) {
    if (visible > 0) this.first ??= performance.now() - this.started;
    if (expected > 0 && visible === expected && failed === 0) this.ready ??= performance.now() - this.started;
    if (this.frames.length >= 240) this.frames.shift();
    this.frames.push(intervalMs);
    if (intervalMs > 50) { this.spikes++; if (this.previousRealization) this.realizationSpikes++; }
    this.previousRealization = realizing;
    this.peakSubmission = Math.max(this.peakSubmission, submissionMs);
  }
  stats() {
    const sorted = [...this.frames].sort((a, b) => a - b);
    return { firstVisibleMs: this.first, viewportReadyMs: this.ready,
      frameP95Ms: sorted[Math.floor(sorted.length * .95)] ?? 0, frameSpikesOver50Ms: this.spikes,
      realizationFrameSpikesOver50Ms: this.realizationSpikes, peakFrameSubmissionMs: this.peakSubmission };
  }
}
