const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const smooth = (value: number) => { const t = clamp(value, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

/** Material-space fracture history. Each segment breaks once; crossing an old
 * cut or releasing a grip never redraws it. R = cut height, G = separation,
 * B = distance from a remaining tether, A = fractured material. */
export class WrapperTearPath {
  static readonly segments = 144;
  readonly count = WrapperTearPath.segments + 1;
  readonly field = new Float32Array(this.count * 4);
  private broken = new Uint8Array(WrapperTearPath.segments);
  private authored = new Uint8Array(this.count);
  private stroke?: { x: number; y: number; startY: number; offset: number };
  revision = 0;
  progress = 0;
  gripU = -.82;
  tipU = -.82;
  direction = 1;
  readonly width: number;
  readonly tearHeight: number;
  constructor(width: number, tearHeight: number) { this.width = width; this.tearHeight = tearHeight; }

  begin(x: number, y: number) {
    this.gripU = this.tipU = clamp(x * 2 / this.width, -1, 1);
    const index = Math.round((this.gripU + 1) * .5 * (this.count - 1));
    const offset = this.authored[index] ? this.field[index * 4] : clamp(y - this.tearHeight - .28, -.32, .32);
    // A grip at a side notch starts at that edge. Middle grips create an
    // interior crack, with intact film tethering both ends until visited.
    const startX = Math.abs(this.gripU) > .72 ? Math.sign(x) * this.width / 2 : x;
    this.stroke = { x: startX, y: offset, startY: y, offset };
  }

  move(x: number, y: number) {
    if (!this.stroke) return;
    const previous = this.stroke;
    const tip = clamp(x * 2 / this.width, -1, 1);
    const nextX = Math.abs(tip) > .94 ? Math.sign(tip) * this.width / 2 : clamp(x, -this.width / 2, this.width / 2);
    const nextY = clamp(previous.offset + (y - previous.startY) * .45, -.34, .34);
    if (Math.abs(nextX - previous.x) > .025) this.direction = Math.sign(nextX - previous.x);
    this.tipU = tip;
    const step = this.width / (this.count - 1), radius = .075;
    const left = clamp(Math.floor((Math.min(previous.x, nextX) - radius + this.width / 2) / step), 0, this.count - 2);
    const right = clamp(Math.floor((Math.max(previous.x, nextX) + radius + this.width / 2) / step), 0, this.count - 2);
    for (let i = left; i <= right; i++) {
      this.broken[i] = 1;
      for (const vertex of [i, i + 1]) if (!this.authored[vertex]) {
        const px = vertex * step - this.width / 2;
        const t = Math.abs(nextX - previous.x) < 1e-6 ? 1 : clamp((px - previous.x) / (nextX - previous.x), 0, 1);
        this.field[vertex * 4] = previous.y + (nextY - previous.y) * t;
        this.authored[vertex] = 1;
      }
    }
    previous.x = nextX; previous.y = nextY;
    this.rebuild();
  }

  end() { this.stroke = undefined; }
  reset() {
    this.field.fill(0); this.broken.fill(0); this.authored.fill(0); this.stroke = undefined;
    this.progress = 0; this.gripU = this.tipU = -.82; this.direction = 1; this.revision++;
  }

  /** Accessible/preview strokes use the same fracture field as pointer input. */
  fill(progress: number) {
    const end = Math.round(clamp(progress, 0, 1) * (this.count - 1));
    for (let i = 0; i < end; i++) {
      this.broken[i] = 1; this.authored[i] = this.authored[i + 1] = 1;
    }
    this.tipU = progress * 2 - 1;
    this.rebuild();
  }

  sample(u: number, channel: number) {
    const index = clamp((u + 1) * .5 * (this.count - 1), 0, this.count - 1);
    const left = Math.floor(index), right = Math.min(left + 1, this.count - 1), t = index - left;
    return this.field[left * 4 + channel] * (1 - t) + this.field[right * 4 + channel] * t;
  }

  private rebuild() {
    // Extend/interpolate the intact boundary between authored fragments. The
    // two skins still share this boundary, so unopened film stays sealed.
    const anchors = Array.from(this.authored.keys()).filter(i => this.authored[i]);
    for (let k = 0; k < anchors.length; k++) {
      const a = k === 0 ? 0 : anchors[k - 1], b = anchors[k];
      for (let i = a; i < b; i++) if (!this.authored[i]) {
        const t = k === 0 ? 1 : (i - a) / (b - a);
        this.field[i * 4] = this.field[a * 4] * (1 - t) + this.field[b * 4] * t;
      }
    }
    if (anchors.length) for (let i = anchors.at(-1)! + 1; i < this.count; i++) this.field[i * 4] = this.field[anchors.at(-1)! * 4];
    const step = this.width / (this.count - 1);
    for (let i = 0; i < this.count; i++) {
      let distance = this.width;
      for (let j = 0; j < this.broken.length; j++) if (!this.broken[j]) distance = Math.min(distance, Math.max(0, j - i, i - j - 1) * step);
      this.field[i * 4 + 1] = smooth(distance / .19);
      this.field[i * 4 + 2] = clamp(distance / 2.5, 0, 1);
      this.field[i * 4 + 3] = (i > 0 && this.broken[i - 1] || i < this.broken.length && this.broken[i]) ? 1 : 0;
    }
    this.progress = this.broken.reduce((sum, value) => sum + value, 0) / this.broken.length;
    this.revision++;
  }
}
