import type { Node } from 'three/webgpu';
import { float, vec2, uv, sin, cos, exp } from 'three/tsl';
import { spectrum } from './DiffractionLayer';
import type { IllustrationRareOptics } from './IllustrationRareLayer';

/** One SUN_PILLAR response for focus and gallery. Source foil intensity and
 * authoritative protection are composed by the caller, exactly once.
 * No periodic stripes, generated stars, time animation or image-derived relief.
 */
export function doubleRareReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: IllustrationRareOptics, footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().sub(.5).mul(vec2(u.aspect, 1));
  const axis = vec2(cos(u.angle), sin(u.angle));
  const across = p.dot(axis), along = p.dot(vec2(axis.y.negate(), axis.x));
  const sheetAxis = tangent.mul(axis.x).add(bitangent.mul(axis.y));
  // Restrained, continuous sheet bow spreads a pillar across the card. This
  // optical approximation redirects the grating only, never the surface normal.
  const inclination = across.mul(.12).add(along.mul(.018));
  const n = normal.add(sheetAxis.mul(inclination)).normalize();
  const grating = sheetAxis.sub(n.mul(sheetAxis.dot(n))).normalize();
  const groove = n.cross(grating).normalize();
  const momentum = light.add(view);
  const variance = (a: Node<'vec3'>) => footprint
    ? footprint[0].dot(a).pow2().add(footprint[1].dot(a).pow2()).div(3) : float(0);
  const width = u.crossWidth.pow2().add(variance(groove)).sqrt();
  const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
  const spectral = spectrum(momentum.dot(grating).abs().mul(u.period), u.bandwidth, u.secondary,
    variance(grating).mul(u.period.pow2())).mul(aperture, u.strength);
  // A narrow, neutral zero-order reflection reveals the source stars without
  // emissive glitter. Finite lights broaden the lobe while conserving energy.
  const halfVariance = footprint ? footprint[0].dot(footprint[0]).add(footprint[1].dot(footprint[1])).div(24) : float(0);
  const broadening = halfVariance.mul(240).add(1);
  const flash = normal.dot(momentum.normalize()).max(0).pow(float(240).div(broadening)).div(broadening).mul(.12);
  return spectral.add(flash).mul(normal.dot(light).max(0), normal.dot(view).max(0));
}
