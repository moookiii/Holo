/** Centimetres, matching CardDefinition. Four columns / three rows from the reference. */
export const BINDER = { columns: 4, rows: 3, perPage: 12, perSpread: 24,
  sheets: 20, faces: 40, capacity: 480, spreads: 21, sheetThickness: .09,
  pageWidth: 29.6, pageHeight: 30.3, hinge: .48,
  pitchX: 7.05, pitchY: 9.45, cardWidth: 6.3, cardHeight: 8.8 } as const;

export function binderCount(count: number) { return Math.max(1, Math.ceil(count / BINDER.capacity)); }
export function spreadCount(_count?: number) { return BINDER.spreads; }
export function clampSpread(spread: number, _count?: number) { return Math.max(0, Math.min(BINDER.sheets, spread)); }
export function spreadFaces(spread: number) { return [spread * 2 - 1, spread * 2].filter(face => face >= 0 && face < BINDER.faces); }
export function spreadIndices(spread: number, count: number, binder = 0) {
  return spreadFaces(clampSpread(spread)).flatMap(face => {
    const start = binder * BINDER.capacity + face * BINDER.perPage;
    return Array.from({ length: Math.min(12, Math.max(0, count - start)) }, (_, i) => start + i);
  });
}
export function faceSide(face: number): -1 | 1 { return face % 2 === 0 ? 1 : -1; }
export function faceHeight(face: number) { return .26 + (face % 2 === 0 ? 20 - face / 2 : (face + 1) / 2) * BINDER.sheetThickness; }
export function pocket(index: number, side: -1 | 1) {
  const column = index % BINDER.columns;
  return { u: 1.2 + BINDER.pitchX * (side === 1 ? column : 3 - column) + BINDER.pitchX / 2,
    y: BINDER.pitchY * (1 - Math.floor(index / BINDER.columns)) };
}

/** The bound edge rises from the centre; the sheet settles onto its own stack. */
export function restingPoint(u: number, side: -1 | 1, height: number) {
  const profile = (distance: number) => {
    const lift = (2.75 - height) * Math.exp(-distance / 1.4);
    return { z: height + lift + .24 * Math.sin(Math.PI * distance / BINDER.pageWidth),
      slope: -lift / 1.4 + .24 * Math.PI / BINDER.pageWidth * Math.cos(Math.PI * distance / BINDER.pageWidth) };
  };
  // Rigid cards support the sheet across each pocket. Confine bending to the
  // empty channels so the spine crown cannot intersect the inner card edges.
  const halfPocket = 3.4;
  const centers = Array.from({ length: BINDER.columns }, (_, column) => pocket(column, 1).u);
  const plane = (center: number, distance: number) => {
    const p = profile(center);
    return { z: p.z + p.slope * (distance - center), slope: p.slope };
  };
  let left = 0, start = profile(0), right = BINDER.pageWidth, end = profile(right);
  for (const center of centers) {
    if (u >= center - halfPocket && u <= center + halfPocket) {
      const p = plane(center, u);
      return { x: side * (BINDER.hinge + u), z: p.z, angle: -side * Math.atan(p.slope) };
    }
    if (u > center + halfPocket) { left = center + halfPocket; start = plane(center, left); }
    else { right = center - halfPocket; end = plane(center, right); break; }
  }
  const width = right - left, t = (u - left) / width;
  const z = (2*t*t*t - 3*t*t + 1)*start.z + (t*t*t - 2*t*t + t)*width*start.slope
    + (-2*t*t*t + 3*t*t)*end.z + (t*t*t - t*t)*width*end.slope;
  const slope = (6*t*t - 6*t)*(start.z - end.z)/width
    + (3*t*t - 4*t + 1)*start.slope + (3*t*t - 2*t)*end.slope;
  return { x: side * (BINDER.hinge + u), z, angle: -side * Math.atan(slope) };
}

/** Arc-length integration preserves sheet width while a curvature wave crosses it.
 * Returning a tangent also lets rigid card stock follow the flexible pockets. */
export function sheetCurve(progress: number, side: -1 | 1, height = .42) {
  const p = Math.max(0, Math.min(1, progress));
  const eased = p * p * (3 - 2 * p);
  const angleAt = (s: number) => {
    // Card stock stays planar; the unoccupied weld channels take most of the
    // curvature. Smooth transitions prevent film cutting through rigid cards.
    const distance = s * BINDER.pageWidth;
    let supported = 4.725;
    for (let seam = 0; seam < 3; seam++) {
      const center = 8.25 + seam * BINDER.pitchX;
      const t = Math.max(0, Math.min(1, (distance - center + .34) / .68));
      supported += BINDER.pitchX * t * t * (3 - 2 * t);
    }
    const k = supported / BINDER.pageWidth;
    return Math.PI * eased + Math.sin(Math.PI * eased) * (1.35 * (k - .5) + .22 * Math.sin(k * Math.PI * 2 - eased * Math.PI));
  };
  // Integrate once per pose, then interpolate for every sheet/film vertex.
  const steps = 512, step = BINDER.pageWidth / steps;
  const xs = new Float64Array(steps + 1), zs = new Float64Array(steps + 1);
  for (let i = 0; i < steps; i++) {
    const a = angleAt((i + .5) / steps);
    xs[i + 1] = xs[i] + Math.cos(a) * step; zs[i + 1] = zs[i] + Math.sin(a) * step;
  }
  // The sheet relaxes before landing; the small final lift decays smoothly.
  const settle = Math.sin(Math.PI * p) * .16 * Math.sin(p * Math.PI * 4);
  return (u: number) => {
    const sample = Math.max(0, Math.min(steps, u / step)), i = Math.min(steps - 1, Math.floor(sample)), t = sample - i;
    const x = xs[i] + (xs[i + 1] - xs[i]) * t, z = zs[i] + (zs[i + 1] - zs[i]) * t;
    const rest = restingPoint(u, side, height);
    const crown = rest.z - height;
    return { x: side * (BINDER.hinge * Math.cos(Math.PI * eased) + x), z: z + settle + height + crown,
      angle: -side * angleAt(u / BINDER.pageWidth) + rest.angle * (1 - 2 * eased) };
  };
}
export function sheetPoint(u: number, progress: number, side: -1 | 1) { return sheetCurve(progress, side)(u); }

export class BinderNavigation {
  spread = 0;
  binder = 0;
  turn?: { from: number; to: number; direction: -1 | 1; elapsed: number; progress: number; velocity: number; target: number; dragging: boolean };
  count: number;
  constructor(count = 0) { this.count = count; }
  setCount(count: number) { this.count = count; this.binder = Math.min(this.binder, binderCount(count) - 1); this.spread = clampSpread(this.spread); this.turn = undefined; }
  selectBinder(binder: number) { this.binder = Math.max(0, Math.min(binderCount(this.count) - 1, binder)); this.spread = 0; this.turn = undefined; }
  begin(direction: -1 | 1, dragging = false) {
    if (this.turn) return false;
    const to = clampSpread(this.spread + direction, this.count);
    if (to === this.spread) return false;
    this.turn = { from: this.spread, to, direction, elapsed: 0, progress: 0, velocity: 0, target: 1, dragging }; return true;
  }
  drag(progress: number, velocity = 0) { if (this.turn?.dragging) { this.turn.progress = Math.max(0, Math.min(1, progress)); this.turn.velocity = Math.max(-2, Math.min(2, velocity)); } }
  release(cancel = false) { if (this.turn?.dragging) { this.turn.dragging = false; this.turn.target = !cancel && this.turn.progress + this.turn.velocity * .055 >= .48 ? 1 : 0; } }
  advance(dt: number, reduced = false) {
    if (!this.turn) return 0;
    const turn = this.turn, step = Math.min(.032, Math.max(0, dt));
    turn.elapsed += step;
    if (!turn.dragging) {
      turn.velocity += (turn.target - turn.progress) * (reduced ? 320 : 145) * step;
      turn.velocity *= Math.exp(-(reduced ? 30 : 18) * step);
      turn.progress = Math.max(0, Math.min(1, turn.progress + turn.velocity * step));
      if (Math.abs(turn.target - turn.progress) < .002 && Math.abs(turn.velocity) < .035) {
        this.spread = turn.target === 1 ? turn.to : turn.from; this.turn = undefined; return turn.target;
      }
    }
    return turn.progress;
  }
}
