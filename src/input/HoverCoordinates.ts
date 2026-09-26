import { Vector2, Vector3 } from 'three/webgpu';

export function hoverFromCardCenter(x: number, y: number, rect: Pick<DOMRect, 'width' | 'height'>, center: Vector2) {
  return new Vector2((x - center.x) / (rect.width * .42), (y - center.y) / (rect.height * .42));
}

export function projectAroundCardCenter(x: number, y: number, rect: Pick<DOMRect, 'width' | 'height'>, center: Vector2, target: Vector3) {
  const radius = Math.min(rect.width, rect.height) * .42;
  const px = (x - center.x) / radius, py = (center.y - y) / radius;
  const d = px * px + py * py;
  return target.set(px, py, d <= .5 ? Math.sqrt(1 - d) : .5 / Math.sqrt(d)).normalize();
}
