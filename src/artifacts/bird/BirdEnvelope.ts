import { Vector3 } from 'three/webgpu';
import type { P } from './BirdParts.ts';

// The same sections drive the shell and the clearance checks for its contents.
// Widths and the unseen underside are inferred from the supplied photographs.
export const torso = [
  [-1.86, -.26, -.69, .20], [-1.5, .08, -.77, .43],
  [-1.08, .43, -.82, .64], [-.58, .82, -.84, .81],
  [-.02, 1.12, -.8, .86], [.52, 1.28, -.66, .80],
  [.99, 1.39, -.38, .66], [1.39, 1.51, .10, .5],
  [1.69, 1.65, .61, .37], [1.89, 1.73, 1.14, .28],
];
export const head = [
  [.99, 1.38, .98, .20], [1.20, 1.77, 1.00, .35],
  [1.5, 2.00, 1.02, .44], [1.83, 2.04, 1.12, .46],
  [2.12, 1.94, 1.27, .35], [2.35, 1.69, 1.36, .18],
  [2.43, 1.53, 1.415, .055],
];

export function interpolate(stations: number[][], u: number, component: number) {
  const q = Math.min(.999999, Math.max(0, u)) * (stations.length - 1), i = Math.floor(q), t = q - i;
  const a = stations[Math.max(0, i - 1)][component], b = stations[i][component];
  const c = stations[Math.min(stations.length - 1, i + 1)][component], d = stations[Math.min(stations.length - 1, i + 2)][component];
  return .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
}

export function section(stations: number[][], u: number, angle: number) {
  const x = interpolate(stations, u, 0), top = interpolate(stations, u, 1), bottom = interpolate(stations, u, 2), width = interpolate(stations, u, 3);
  return new Vector3(x, (top + bottom) / 2 + (top - bottom) / 2 * Math.sin(angle), width * Math.cos(angle));
}

function crossSection(stations: number[][], x: number) {
  if (x < stations[0][0] || x > stations.at(-1)![0]) return null;
  let lo = 0, hi = 1;
  for (let i = 0; i < 18; i++) {
    const u = (lo + hi) / 2;
    if (interpolate(stations, u, 0) < x) lo = u; else hi = u;
  }
  const u = (lo + hi) / 2, top = interpolate(stations, u, 1), bottom = interpolate(stations, u, 2);
  return { cy: (top + bottom) / 2, ry: (top - bottom) / 2, rz: interpolate(stations, u, 3) };
}

/** Maximum internal half-depth at XY, allowing for the panel wall and clearance. */
export function shellDepth(x: number, y: number, clearance = .025) {
  let depth = 0;
  for (const stations of [torso, head]) {
    const s = crossSection(stations, x);
    if (!s || s.ry <= clearance) continue;
    const v = (y - s.cy) / (s.ry - clearance);
    if (Math.abs(v) < 1) depth = Math.max(depth, (s.rz - clearance) * Math.sqrt(1 - v * v));
  }
  return depth;
}

/** Route flexible cables within the formed shell, including their tube radius. */
export function insetCable(p: P, clearance: number): P {
  let best = p, distance = Infinity;
  for (const stations of [torso, head]) {
    const s = crossSection(stations, p[0]);
    if (!s || s.ry <= clearance || s.rz <= clearance) continue;
    const y = p[1] - s.cy, ry = s.ry - clearance, rz = s.rz - clearance;
    const scale = Math.max(1, Math.hypot(y / ry, p[2] / rz));
    const candidate: P = [p[0], s.cy + y / scale, p[2] / scale];
    const d = Math.hypot(candidate[1] - p[1], candidate[2] - p[2]);
    if (d < distance) { best = candidate; distance = d; }
  }
  return best;
}
