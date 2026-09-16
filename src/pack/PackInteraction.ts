import { Plane, Raycaster, Vector2, Vector3, type Camera } from 'three/webgpu';
import type { PackScene } from './PackScene';
export interface PackPointer { x: number; y: number; local: Vector3 | null; card: number; ball: Vector3; time: number; }
interface Actions { down: (p: PackPointer) => void; move: (p: PackPointer, held: boolean) => void; up: (cancel: boolean) => void; }
/** All manipulation begins on the rendered object, with pointer capture through
 * out-of-canvas drags and cancellation on focus loss. */
export class PackInteraction {
  private ray = new Raycaster();
  private plane = new Plane(new Vector3(0, 0, 1), 0);
  private pointer?: number;
  private abort = new AbortController();
  constructor(private element: HTMLElement, private camera: Camera, private scene: PackScene, private actions: Actions) {
    const options = { signal: this.abort.signal };
    element.addEventListener('pointerdown', e => {
      if (e.button !== 0 || this.pointer !== undefined) return;
      this.pointer = e.pointerId; element.setPointerCapture(e.pointerId); actions.down(this.sample(e));
    }, options);
    element.addEventListener('pointermove', e => { if (this.pointer !== undefined && this.pointer !== e.pointerId) return; actions.move(this.sample(e), this.pointer !== undefined); }, options);
    const release = (e: PointerEvent) => {
      if (this.pointer !== e.pointerId) return;
      this.pointer = undefined; actions.up(e.type !== 'pointerup');
      if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
    };
    element.addEventListener('pointerup', release, options); element.addEventListener('pointercancel', release, options);
    element.addEventListener('lostpointercapture', release, options);
    element.addEventListener('pointerleave', () => { if (this.pointer === undefined) actions.move({ x: 0, y: 0, local: null, card: -1, ball: new Vector3(0, 0, 1), time: 0 }, false); }, options);
    window.addEventListener('blur', () => { this.pointer = undefined; actions.up(true); }, options);
  }
  private sample(e: PointerEvent): PackPointer {
    const rect = this.element.getBoundingClientRect();
    this.ray.setFromCamera(new Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), this.camera);
    const point = this.ray.ray.intersectPlane(this.plane, new Vector3()) ?? new Vector3();
    const wrapperHit = this.scene.wrapper.root.visible ? this.ray.intersectObject(this.scene.wrapper.root, true)[0] : undefined;
    const cardHit = this.ray.intersectObjects(this.scene.cards.map(c => c.mesh), false)[0];
    const radius = Math.min(rect.width, rect.height) * .42;
    const bx = (e.clientX - rect.left - rect.width / 2) / radius, by = (rect.top + rect.height / 2 - e.clientY) / radius;
    const distance = bx * bx + by * by;
    const ball = new Vector3(bx, by, distance <= .5 ? Math.sqrt(1 - distance) : .5 / Math.sqrt(distance)).normalize();
    return { x: point.x, y: point.y, local: wrapperHit ? this.scene.wrapper.root.worldToLocal(wrapperHit.point.clone()) : null,
      card: cardHit ? this.scene.cards.findIndex(c => c.mesh === cardHit.object) : -1, ball, time: e.timeStamp };
  }
  dispose() { this.abort.abort(); this.element.style.cursor = ''; }
}
