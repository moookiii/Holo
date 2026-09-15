import { Vector3, type Quaternion } from 'three/webgpu';
import type { CardDimensions } from '../card/CardDefinition';

const corner = new Vector3();
/** Fit a rotated physical object using perspective bounds, including the near-facing corners. */
export function framingDistance(d: CardDimensions, orientation: Quaternion, aspect: number, fov: number, viewportHeight: number) {
  const tan = Math.tan(fov * Math.PI / 360);
  const height = Math.max(0.64, 1 - 126 / viewportHeight);
  const base = Math.max(d.height / (2 * tan * height * 0.88), d.width / (2 * tan * aspect * 0.84));
  let needed = base;
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    corner.set(x * d.width / 2, y * d.height / 2, z * d.thickness / 2).applyQuaternion(orientation);
    needed = Math.max(needed, Math.abs(corner.x) / (tan * aspect * 0.9) + corner.z, Math.abs(corner.y) / (tan * height * 0.96) + corner.z);
  }
  return needed;
}
