import { Vector2 } from 'three/webgpu';

export function hoverFromCardCenter(x: number, y: number, rect: Pick<DOMRect, 'width' | 'height'>, center: Vector2) {
  return new Vector2((x - center.x) / (rect.width * .42), (y - center.y) / (rect.height * .42));
}
