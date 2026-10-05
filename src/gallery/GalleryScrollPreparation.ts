/** During a sustained fling, avoid starting jobs for rows shown for one frame.
 * Existing pixels/rendering never wait. A first scroll or slow scroll starts
 * work immediately; a stopped fling resumes cold work within 80 ms. */
export class GalleryScrollPreparation {
  private last?: { top: number; at: number };
  private resumeAt = 0;
  scroll(top: number, at: number) {
    if (this.last && top !== this.last.top && at - this.last.at < 80 && Math.abs(top - this.last.top) > 32)
      this.resumeAt = at + 80;
    this.last = { top, at };
  }
  ready(at: number) { return at >= this.resumeAt; }
  reset() { this.last = undefined; this.resumeAt = 0; }
}
