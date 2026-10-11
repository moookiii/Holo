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

/** Toksvig's mean-normal length estimates the angular variance lost to linear
 * texture filtering. Read BEFORE normalMap normalizes it. Ordinary RGB mipmaps
 * retain this first moment; renormalizing the mip levels would destroy it.
 * Allow the worst-case RGB8 unit-vector rounding error (sqrt(3) / 255), so a
 * resolved, constant normal does not acquire artificial roughness.
 * This is a lobe integration term, never a change to the authored normal.
 */
export function normalMipVariance(encoded: Node<'vec3'>): Node<'float'> {
  const length = encoded.mul(2).sub(1).length().clamp(.001, 1);
  return length.oneMinus().sub(Math.sqrt(3) / 255).max(0).div(length);
}
