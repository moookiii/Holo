import { Quaternion, Vector3 } from 'three/webgpu';
const xAxis = new Vector3(1, 0, 0), yAxis = new Vector3(0, 1, 0), zAxis = new Vector3(0, 0, 1);
export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export const ease = (n: number) => { const t = clamp(n); return t * t * t * (t * (t * 6 - 15) + 10); };
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function orientation(yaw = 0, pitch = 0, roll = 0) {
  return new Quaternion().setFromAxisAngle(yAxis, yaw)
    .multiply(new Quaternion().setFromAxisAngle(xAxis, pitch))
    .premultiply(new Quaternion().setFromAxisAngle(zAxis, roll));
}
/** Analytic critically damped spring: stable through dropped frames. */
export class Spring {
  velocity = 0;
  value: number;
  target: number;
  frequency: number;
  constructor(value = 0, target = value, frequency = 18) { this.value = value; this.target = target; this.frequency = frequency; }
  step(dt: number) {
    const decay = Math.exp(-this.frequency * dt), offset = this.value - this.target;
    const impulse = (this.velocity + this.frequency * offset) * dt;
    this.value = this.target + (offset + impulse) * decay;
    this.velocity = (this.velocity - this.frequency * impulse) * decay;
    if (Math.abs(this.value - this.target) + Math.abs(this.velocity) < 1e-6) this.snap(this.target);
    return this.value;
  }
  snap(value: number) { this.value = this.target = value; this.velocity = 0; }
}
