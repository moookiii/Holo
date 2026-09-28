export interface TiltOptions { radius: number; strength: number; falloff: number; damping: number; }
export const defaultTilt: TiltOptions = { radius: 360, strength: .65, falloff: 1.6, damping: 11 };
export function influence(dx: number, dy: number, options: TiltOptions = defaultTilt) {
  const radius = Math.max(1, options.radius), distance = Math.hypot(dx, dy) / radius;
  const falloff = Math.pow(Math.max(0, 1 - distance * distance), Math.max(.1, options.falloff));
  return { pitch: -dy / radius * options.strength * falloff, yaw: dx / radius * options.strength * falloff };
}
export function damp(current: number, target: number, dt: number, damping = defaultTilt.damping) {
  return current + (target - current) * (1 - Math.exp(-damping * Math.max(0, Math.min(dt, .05))));
}
