import type { Node } from 'three/webgpu';

/** Variance of a locally linear signal across a square pixel. Unlike an abs
 * path derivative this stays continuous where the diffraction order changes sign.
 * No noise, animation input, extra texture fetch, or change to the normal itself.
 */
export function pixelVariance(value: Node<'float'>): Node<'float'> {
  return value.dFdx().pow2().add(value.dFdy().pow2()).div(12);
}

export function normalPixelVariance(value: Node<'vec3'>): Node<'float'> {
  const dx = value.dFdx(), dy = value.dFdy();
  return dx.dot(dx).add(dy.dot(dy)).div(12);
}
