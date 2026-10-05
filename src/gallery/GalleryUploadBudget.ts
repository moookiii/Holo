/** Bound upload bursts by both synchronous CPU time and transferred preview bytes.
 * One upload always progresses even when a slow device exceeds the time budget. */
export const GALLERY_UPLOAD_BYTES_PER_FRAME = 8 * 1024 * 1024;
export const GALLERY_UPLOAD_MS_PER_FRAME = 2;

export class GalleryUploadBudget {
  private now: () => number;
  private started = 0;
  private bytes = 0;
  private count = 0;
  private peakBytes = 0;
  private peakCount = 0;
  private peakMs = 0;
  constructor(now = () => performance.now()) { this.now = now; }
  beginFrame() { this.started = this.now(); this.bytes = this.count = 0; }
  allows(bytes: number) {
    return this.count === 0 || (this.bytes + bytes <= GALLERY_UPLOAD_BYTES_PER_FRAME
      && this.now() - this.started < GALLERY_UPLOAD_MS_PER_FRAME);
  }
  record(bytes: number) {
    this.bytes += bytes; this.count++;
    this.peakBytes = Math.max(this.peakBytes, this.bytes);
    this.peakCount = Math.max(this.peakCount, this.count);
    this.peakMs = Math.max(this.peakMs, this.now() - this.started);
  }
  stats() { return { frameUploadBytes: this.bytes, frameUploads: this.count,
    peakFrameUploadBytes: this.peakBytes, peakFrameUploads: this.peakCount, peakFrameUploadSchedulingMs: this.peakMs }; }
}
