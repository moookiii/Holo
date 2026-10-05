/** Centimetres, matching CardDefinition. Four columns / three rows from the reference. */
export const BINDER = { columns: 4, rows: 3, perPage: 12, perSpread: 24,
  pageWidth: 29.6, pageHeight: 30.3, hinge: .48,
  pitchX: 7.05, pitchY: 9.45, cardWidth: 6.3, cardHeight: 8.8 } as const;

export function spreadCount(count: number) { return Math.max(1, Math.ceil(count / BINDER.perSpread)); }
export function clampSpread(spread: number, count: number) { return Math.max(0, Math.min(spreadCount(count) - 1, spread)); }
export function spreadIndices(spread: number, count: number) {
  const start = clampSpread(spread, count) * BINDER.perSpread;
  return Array.from({ length: Math.min(BINDER.perSpread, Math.max(0, count - start)) }, (_, i) => start + i);
}
export function pocket(index: number, side: -1 | 1) {
  const column = index % BINDER.columns;
  return { u: 1.2 + BINDER.pitchX * (side === 1 ? column : 3 - column) + BINDER.pitchX / 2,
    y: BINDER.pitchY * (1 - Math.floor(index / BINDER.columns)) };
}

/** Arc-length integration preserves sheet width while a curvature wave crosses it.
 * Returning a tangent also lets rigid card stock follow the flexible pockets. */
export function sheetPoint(u: number, progress: number, side: -1 | 1) {
  const p = Math.max(0, Math.min(1, progress));
  const eased = p * p * (3 - 2 * p);
  const angleAt = (s: number) => Math.PI * eased + Math.sin(Math.PI * eased) * (.68 * (s - .5) + .14 * Math.sin(s * Math.PI * 2 - eased * Math.PI));
  const steps = 48, step = u / steps;
  let x = 0, z = 0;
  for (let i = 0; i < steps; i++) {
    const a = angleAt((i + .5) * step / BINDER.pageWidth);
    x += Math.cos(a) * step; z += Math.sin(a) * step;
  }
  const angle = angleAt(u / BINDER.pageWidth);
  // The sheet relaxes before landing; the small final lift decays smoothly.
  const settle = Math.sin(Math.PI * p) * .16 * Math.sin(p * Math.PI * 4);
  return { x: side * (BINDER.hinge + x), z: z + settle + .42, angle: -side * angle };
}

export class BinderNavigation {
  spread = 0;
  turn?: { from: number; to: number; direction: -1 | 1; elapsed: number };
  count: number;
  constructor(count = 0) { this.count = count; }
  setCount(count: number) { this.count = count; this.spread = clampSpread(this.spread, count); this.turn = undefined; }
  begin(direction: -1 | 1) {
    if (this.turn) return false;
    const to = clampSpread(this.spread + direction, this.count);
    if (to === this.spread) return false;
    this.turn = { from: this.spread, to, direction, elapsed: 0 }; return true;
  }
  advance(dt: number, duration = 1.35) {
    if (!this.turn) return 0;
    this.turn.elapsed += Math.min(.05, Math.max(0, dt));
    const progress = Math.min(1, this.turn.elapsed / duration);
    if (progress === 1) { this.spread = this.turn.to; this.turn = undefined; }
    return progress;
  }
}
