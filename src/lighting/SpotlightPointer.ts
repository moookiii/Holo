import { Camera, Object3D, Plane, Raycaster, SpotLight, Vector2, Vector3 } from 'three/webgpu';

/** Tracks independently of card gestures so gallery overlays also receive light. */
export class SpotlightPointer {
  private cursor = new Vector2();
  private hasCursor = false;
  private ray = new Raycaster();
  private plane = new Plane(new Vector3(0, 0, 1), 0);
  private point = new Vector3();
  private move = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    this.cursor.set(event.clientX, event.clientY);
    this.hasCursor = true;
  };

  constructor(private element: HTMLElement, private camera: Camera, private light: SpotLight) {
    document.addEventListener('pointermove', this.move, { capture: true });
    document.addEventListener('pointerdown', this.move, { capture: true });
  }

  update(card?: Object3D) {
    if (!this.hasCursor || !this.light.visible) return;
    const rect = this.element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new Vector2(
      (this.cursor.x - rect.left) / rect.width * 2 - 1,
      1 - (this.cursor.y - rect.top) / rect.height * 2,
    ), this.camera);
    // Intersect the actual tilted card; use its depth plane outside its edges.
    card?.updateWorldMatrix(true, false);
    const hit = card ? this.ray.intersectObject(card, false)[0] : undefined;
    this.plane.constant = card ? -card.getWorldPosition(this.point).z : 0;
    if (hit) this.point.copy(hit.point);
    else if (!this.ray.ray.intersectPlane(this.plane, this.point)) return;
    this.light.target.position.copy(this.point);
    this.light.target.updateMatrixWorld();
  }

  dispose() {
    document.removeEventListener('pointermove', this.move, { capture: true });
    document.removeEventListener('pointerdown', this.move, { capture: true });
  }
}
