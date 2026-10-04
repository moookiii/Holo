import { Vector2 } from 'three/webgpu';
import type { CardMotion, InteractionMode } from './Motion';
import { hoverFromCardCenter } from './HoverCoordinates';

export class PointerController {
  private enabled = true;
  private pointers = new Map<number, Vector2>();
  private lastTime = 0;
  private previous = new Vector2();
  private pinchDistance = 0;
  private clickStart = new Vector2();
  private clickDistance = 0;
  private translating = false;
  private disposeHandlers: (() => void)[] = [];
  constructor(private element: HTMLElement, private motion: CardMotion, private onClick?: (x: number, y: number) => void, private onTranslate?: (dx: number, dy: number) => void, private cardCenter?: (rect: DOMRect) => Vector2, private onDragStart?: () => void) {
    motion.enableOrbitRotation();
    const on = <K extends keyof HTMLElementEventMap>(name: K, handler: (e: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
      element.addEventListener(name, handler, options);
      this.disposeHandlers.push(() => element.removeEventListener(name, handler));
    };
    on('pointerdown', e => {
      if (!this.enabled) return;
      if (e.button !== 0 && e.button !== 1) return;
      if (e.button === 1) e.preventDefault();
      this.onDragStart?.();
      element.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, new Vector2(e.clientX, e.clientY));
      if (this.pointers.size === 1) this.translating = e.shiftKey || e.button === 1;
      this.motion.dragging = true; this.motion.halt();
      this.previous.set(e.clientX, e.clientY); this.lastTime = e.timeStamp;
      this.clickStart.copy(this.previous); this.clickDistance = this.pointers.size > 1 ? 100 : 0;
      if (this.pointers.size === 2) this.pinchDistance = this.distance();
      element.classList.add('dragging');
      this.follow(e.clientX, e.clientY);
    });
    on('pointermove', e => {
      if (!this.enabled) return;
      if (!this.pointers.has(e.pointerId)) {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
          this.follow(e.clientX, e.clientY);
        }
        return;
      }
      this.pointers.get(e.pointerId)!.set(e.clientX, e.clientY);
      this.clickDistance = Math.max(this.clickDistance, this.clickStart.distanceTo(new Vector2(e.clientX, e.clientY)));
      if (this.pointers.size >= 2) {
        const d = this.distance();
        if (this.pinchDistance > 0) this.motion.targetZoom = Math.max(0.58, Math.min(1.9, this.motion.targetZoom * this.pinchDistance / d));
        this.pinchDistance = d; return;
      }
      if (this.translating) {
        this.onTranslate?.(e.clientX - this.previous.x, e.clientY - this.previous.y);
        this.follow(e.clientX, e.clientY);
        this.previous.set(e.clientX, e.clientY); this.lastTime = e.timeStamp;
        return;
      }
      this.motion.applyOrbitDrag(e.clientX - this.previous.x, e.clientY - this.previous.y, element.clientHeight);
      this.follow(e.clientX, e.clientY);
      this.previous.set(e.clientX, e.clientY); this.lastTime = e.timeStamp;
    });
    const release = (e: PointerEvent) => {
      const click = this.enabled && e.type === 'pointerup' && this.pointers.size === 1 && this.pointers.has(e.pointerId) && this.clickDistance < 5;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 1) {
        const p = this.pointers.values().next().value!;
        this.previous.copy(p); this.lastTime = e.timeStamp;
      }
      if (!this.pointers.size) {
        this.motion.dragging = false; element.classList.remove('dragging');
        if (e.type === 'pointercancel') this.motion.halt();
        if (e.pointerType === 'touch' || e.type === 'pointercancel') this.motion.setHover(0, 0);
        else {
          const rect = element.getBoundingClientRect();
          if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) this.motion.setHover(0, 0);
        }
        if (click && !this.translating) this.onClick?.(e.clientX, e.clientY);
        this.translating = false;
      }
    };
    on('pointerup', release); on('pointercancel', release); on('lostpointercapture', release);
    on('auxclick', e => { if (e.button === 1) e.preventDefault(); });
    on('pointerleave', () => { if (!this.motion.dragging) this.motion.setHover(0, 0); });
    on('wheel', e => {
      if (!this.enabled) return;
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? element.clientHeight : 1);
      this.motion.targetZoom = Math.max(0.58, Math.min(1.9, this.motion.targetZoom * Math.exp(Math.max(-250, Math.min(250, delta)) * 0.0012)));
    }, { passive: false });
    element.dataset.mode = 'combined';
  }
  setMode(mode: InteractionMode) { this.motion.setMode(mode); this.element.dataset.mode = 'combined'; }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) { this.pointers.clear(); this.translating = false; this.motion.dragging = false; this.motion.halt(); this.motion.setHover(0, 0); this.element.classList.remove('dragging'); }
  }
  private follow(x: number, y: number) {
    const rect = this.element.getBoundingClientRect();
    const center = this.cardCenter?.(rect) ?? new Vector2(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const hover = hoverFromCardCenter(x, y, rect, center);
    this.motion.setHover(hover.x, hover.y);
  }
  private distance() { const p = [...this.pointers.values()]; return p[0].distanceTo(p[1]); }
  dispose() { this.disposeHandlers.forEach(f => f()); }
}
