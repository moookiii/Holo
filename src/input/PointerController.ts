import { Quaternion, Vector2, Vector3 } from 'three/webgpu';
import type { CardMotion, InteractionMode } from './Motion';

export class PointerController {
  private pointers = new Map<number, Vector2>();
  private lastTime = 0;
  private previous = new Vector2();
  private pinchDistance = 0;
  private from = new Vector3();
  private to = new Vector3();
  private turn = new Quaternion();
  private identity = new Quaternion();
  private disposeHandlers: (() => void)[] = [];
  constructor(private element: HTMLElement, private motion: CardMotion) {
    const on = <K extends keyof HTMLElementEventMap>(name: K, handler: (e: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
      element.addEventListener(name, handler, options);
      this.disposeHandlers.push(() => element.removeEventListener(name, handler));
    };
    on('pointerdown', e => {
      if (e.button !== 0) return;
      element.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, new Vector2(e.clientX, e.clientY));
      this.motion.dragging = true; this.motion.halt();
      this.previous.set(e.clientX, e.clientY); this.lastTime = e.timeStamp;
      if (this.pointers.size === 2) this.pinchDistance = this.distance();
      if (this.motion.mode === 'rotate') element.classList.add('dragging');
      else this.follow(e.clientX, e.clientY);
    });
    on('pointermove', e => {
      if (!this.pointers.has(e.pointerId)) {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
          this.follow(e.clientX, e.clientY);
        }
        return;
      }
      this.pointers.get(e.pointerId)!.set(e.clientX, e.clientY);
      if (this.pointers.size >= 2) {
        const d = this.distance();
        if (this.pinchDistance > 0) this.motion.targetZoom = Math.max(0.58, Math.min(1.9, this.motion.targetZoom * this.pinchDistance / d));
        this.pinchDistance = d; return;
      }
      if (this.motion.mode === 'rotate') {
        this.project(this.previous.x, this.previous.y, this.from); this.project(e.clientX, e.clientY, this.to);
        this.turn.setFromUnitVectors(this.from, this.to);
        if (e.shiftKey) this.turn.slerpQuaternions(this.identity, this.turn, .25);
        this.motion.applyRotation(this.turn, Math.max(.001, Math.min(.05, (e.timeStamp - this.lastTime) / 1000)));
      } else this.follow(e.clientX, e.clientY);
      this.previous.set(e.clientX, e.clientY); this.lastTime = e.timeStamp;
    });
    const release = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 1) {
        const p = this.pointers.values().next().value!;
        this.previous.copy(p); this.lastTime = e.timeStamp;
      }
      if (!this.pointers.size) {
        this.motion.dragging = false; element.classList.remove('dragging');
        if (e.timeStamp - this.lastTime > 80 || e.type === 'pointercancel') this.motion.velocity.set(0, 0, 0);
        if (e.pointerType === 'touch' || e.type === 'pointercancel') this.motion.setHover(0, 0);
      }
    };
    on('pointerup', release); on('pointercancel', release); on('lostpointercapture', release);
    on('pointerleave', () => { if (!this.motion.dragging) this.motion.setHover(0, 0); });
    on('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? element.clientHeight : 1);
      this.motion.targetZoom = Math.max(0.58, Math.min(1.9, this.motion.targetZoom * Math.exp(Math.max(-250, Math.min(250, delta)) * 0.0012)));
    }, { passive: false });
    element.dataset.mode = motion.mode;
  }
  setMode(mode: InteractionMode) { this.motion.setMode(mode); this.element.dataset.mode = mode; }
  private follow(x: number, y: number) {
    const rect = this.element.getBoundingClientRect();
    this.motion.setHover((x - rect.left - rect.width / 2) / (rect.width * .42), (y - rect.top - rect.height / 2) / (rect.height * .42));
  }
  private project(x: number, y: number, target: Vector3) {
    const rect = this.element.getBoundingClientRect(), radius = Math.min(rect.width, rect.height) * .42;
    const px = (x - rect.left - rect.width / 2) / radius, py = (rect.top + rect.height / 2 - y) / radius;
    const d = px * px + py * py;
    return target.set(px, py, d <= .5 ? Math.sqrt(1 - d) : .5 / Math.sqrt(d)).normalize();
  }
  private distance() { const p = [...this.pointers.values()]; return p[0].distanceTo(p[1]); }
  dispose() { this.disposeHandlers.forEach(f => f()); }
}
