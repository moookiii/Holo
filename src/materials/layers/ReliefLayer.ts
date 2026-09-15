import type { Node } from 'three/webgpu';
import { Fn, normalViewGeometry, positionView } from 'three/tsl';

/** Surface-gradient normal from authored height in centimetres, independent of display resolution. */
export function reliefNormal(height: Node<'float'>, heightCm: Node<'float'>) {
  return Fn(() => {
    const n = normalViewGeometry as unknown as Node<'vec3'>;
    const dx = positionView.dFdx(), dy = positionView.dFdy();
    const r1 = dy.cross(n), r2 = n.cross(dx), determinant = dx.dot(r1);
    const gradient = r1.mul(height.dFdx()).add(r2.mul(height.dFdy())).mul(determinant.sign(), heightCm);
    return n.mul(determinant.abs().max(.00000001)).sub(gradient).normalize();
  })();
}
