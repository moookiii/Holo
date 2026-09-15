import { Quaternion, Vector3 } from 'three/webgpu';

export type InteractionMode = 'rotate' | 'tilt';
export const X_AXIS = new Vector3(1, 0, 0);
export const Y_AXIS = new Vector3(0, 1, 0);
export const Z_AXIS = new Vector3(0, 0, 1);
export const DEFAULT_ORIENTATION = new Quaternion();

export function smootherstep(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }

export class CardMotion {
  readonly manual = new Quaternion();
  readonly orientation = new Quaternion();
  readonly velocity = new Vector3();
  readonly hover = new Vector3();
  readonly hoverTarget = new Vector3();
  readonly presentation = new Quaternion();
  mode: InteractionMode;
  zoom = 1;
  targetZoom = 1;
  dragging = false;
  private flipBase = 0;
  private flipElapsed = 0;
  private flipPending = 0;
  private flipActive = false;
  private flip = new Quaternion();
  private delta = new Quaternion();
  private axis = new Vector3();
  private resetting = false;
  private resetElapsed = 0;
  private resetStart = new Quaternion();
  readonly flipDuration = 0.58;

  constructor(mode: InteractionMode = 'tilt') {
    this.mode = mode;
    this.manual.copy(DEFAULT_ORIENTATION); this.orientation.copy(DEFAULT_ORIENTATION);
  }

  setMode(mode: InteractionMode) {
    this.mode = mode; this.velocity.set(0, 0, 0);
    this.hoverTarget.set(0, 0, 0);
  }
  requestFlip() {
    this.halt(); this.flipPending = Math.min(8, this.flipPending + 1);
  }
  reset() {
    this.resetStart.copy(this.orientation); this.resetElapsed = 0; this.resetting = true;
    this.flipBase = 0; this.flipPending = 0; this.flipActive = false;
    this.hover.set(0, 0, 0); this.hoverTarget.set(0, 0, 0);
    this.targetZoom = 1; this.velocity.set(0, 0, 0);
  }
  halt() {
    if (this.resetting) {
      this.manual.copy(this.orientation);
      this.hover.set(0, 0, 0); this.hoverTarget.set(0, 0, 0);
    }
    this.resetting = false; this.velocity.set(0, 0, 0);
  }
  applyRotation(rotation: Quaternion, dt: number) {
    if (this.mode !== 'rotate') return;
    if (this.resetting) this.halt();
    this.delta.copy(rotation).normalize();
    if (this.delta.w < 0) this.delta.set(-this.delta.x, -this.delta.y, -this.delta.z, -this.delta.w);
    this.manual.premultiply(this.delta).normalize();
    if (dt > 0) {
      const sine = Math.hypot(this.delta.x, this.delta.y, this.delta.z);
      const speed = Math.min(7, 2 * Math.atan2(sine, this.delta.w) / dt);
      this.axis.set(this.delta.x, this.delta.y, this.delta.z).multiplyScalar(sine > 1e-10 ? speed / sine : 0);
      this.velocity.lerp(this.axis, 1 - Math.exp(-dt * 32));
    }
  }
  setHover(x: number, y: number) {
    if (this.mode !== 'tilt' || this.resetting) return;
    const px = Math.max(-1, Math.min(1, x)), py = Math.max(-1, Math.min(1, y));
    // Recede the edge in the pointer's direction: right -> right edge back; down -> bottom edge back.
    this.hoverTarget.set(py * .20, px * .24, -px * py * .065);
  }
  update(dt: number) {
    dt = Math.max(0, Math.min(dt, 0.05));
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-dt * 12));
    this.hover.lerp(this.hoverTarget, 1 - Math.exp(-dt * 13));
    if (this.hover.distanceToSquared(this.hoverTarget) < 1e-12) this.hover.copy(this.hoverTarget);
    if (this.resetting) {
      this.resetElapsed += dt;
      const t = Math.min(1, this.resetElapsed / 0.65);
      this.manual.slerpQuaternions(this.resetStart, DEFAULT_ORIENTATION, smootherstep(t));
      this.orientation.copy(this.manual);
      if (t === 1) this.resetting = false;
      return;
    }
    if (!this.dragging && this.mode === 'rotate') {
      const speed = this.velocity.length();
      if (speed > 0.002) {
        // Analytic exponential integration keeps angular travel identical at 60 and 240 Hz.
        const decay = Math.exp(-4.8 * dt);
        this.axis.copy(this.velocity).divideScalar(speed);
        this.manual.premultiply(this.delta.setFromAxisAngle(this.axis, speed * (1 - decay) / 4.8)).normalize();
        this.velocity.multiplyScalar(decay);
      } else this.velocity.set(0, 0, 0);
    }
    if (!this.flipActive && this.flipPending > 0) {
      this.flipPending--; this.flipElapsed = 0; this.flipActive = true;
    }
    let phase = this.flipBase;
    if (this.flipActive) {
      this.flipElapsed += dt;
      const t = Math.min(this.flipElapsed / this.flipDuration, 1);
      phase += Math.PI * smootherstep(t);
      if (t >= 1) { this.flipBase = (this.flipBase + Math.PI) % (Math.PI * 2); this.flipActive = false; phase = this.flipBase; }
    }
    this.flip.setFromAxisAngle(Y_AXIS, phase);
    this.presentation.setFromAxisAngle(Y_AXIS, this.hover.y)
      .multiply(this.delta.setFromAxisAngle(X_AXIS, this.hover.x))
      .multiply(this.delta.setFromAxisAngle(Z_AXIS, this.hover.z));
    this.orientation.copy(this.presentation).multiply(this.manual).multiply(this.flip).normalize();
  }
  setPose(yaw: number, pitch: number, roll = 0) {
    this.halt(); this.flipPending = 0; this.flipActive = false; this.flipBase = 0;
    this.hover.set(0, 0, 0); this.hoverTarget.set(0, 0, 0);
    this.manual.setFromAxisAngle(Y_AXIS, yaw).multiply(this.delta.setFromAxisAngle(X_AXIS, pitch))
      .premultiply(this.delta.setFromAxisAngle(Z_AXIS, roll)).normalize();
    this.orientation.copy(this.manual);
  }
}
