import { Quaternion, Vector3, type PerspectiveCamera } from 'three/webgpu';
import { Spring } from './PackMath';

/** Composition expressed in physical centimetres, with independent spring axes.
 * A constant lens avoids zoom punches; orientation is always a quaternion. */
export class PackCameraRig {
  private x = new Spring(0, 0, 9);
  private y = new Spring(0, 0, 9);
  private z = new Spring(30, 30, 9);
  private orientation = new Quaternion();
  private savedPosition = new Vector3();
  private savedOrientation = new Quaternion();
  constructor(readonly camera: PerspectiveCamera) {}
  begin() {
    this.savedPosition.copy(this.camera.position); this.savedOrientation.copy(this.camera.quaternion);
    this.x.snap(this.camera.position.x); this.y.snap(this.camera.position.y); this.z.snap(this.camera.position.z);
  }
  frame(width: number, height: number, centerY = 0, centerX = 0, depth = 1) {
    const tan = Math.tan(this.camera.fov * Math.PI / 360);
    const safeY = Math.max(.65, 1 - 160 / window.innerHeight);
    this.x.target = centerX; this.y.target = centerY;
    this.z.target = Math.max(height / (2 * tan * safeY), width / (2 * tan * this.camera.aspect * .86)) + depth;
  }
  viewer(distance: number) { this.x.target = 0; this.y.target = -.06; this.z.target = distance; }
  update(dt: number, snap = false, reduced = false) {
    this.x.frequency = this.y.frequency = this.z.frequency = reduced ? 28 : 9;
    if (snap) { this.x.snap(this.x.target); this.y.snap(this.y.target); this.z.snap(this.z.target); }
    this.camera.position.set(this.x.step(dt), this.y.step(dt), this.z.step(dt));
    this.camera.quaternion.slerp(this.orientation, snap ? 1 : 1 - Math.exp(-dt * 10));
    this.camera.updateMatrixWorld();
  }
  restore() { this.camera.position.copy(this.savedPosition); this.camera.quaternion.copy(this.savedOrientation); }
}
