import type { Node } from 'three/webgpu';
import { float, vec2, uv, sin, cos, exp } from 'three/tsl';
import { spectrum } from './DiffractionLayer';
import type { IllustrationRareOptics } from './IllustrationRareLayer';

/** One SUN_PILLAR response for focus and gallery. Source foil intensity and
 * authoritative protection are composed by the caller, exactly once.
 * No line overlay, random stars, time animation or image-derived relief.
 */
export function doubleRareReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: IllustrationRareOptics, stars: Node<'vec4'>, footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().sub(.5).mul(vec2(u.aspect, 1));
  const axis = vec2(cos(u.angle), sin(u.angle));
  const across = p.dot(axis), along = p.dot(vec2(axis.y.negate(), axis.x));
  const sheetAxis = tangent.mul(axis.x).add(bitangent.mul(axis.y));
  // Broad diagonal optical domains seen through rotation in the reference.
  // They redirect wavelengths, never draw a colored/bright line into the print.
  // Slightly unequal domains avoid an evenly ruled, corrugated appearance.
  const phase = across.mul(16).add(sin(along.mul(3)).mul(.18));
  const inclination = sin(phase).mul(.16).add(sin(across.mul(9).add(.8)).mul(.055));
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
  // Cast-and-cure stars are a distinct reflective die in the video, not the
  // tiny bright details embedded in TCGL coverage. RG supplies fixed optical
  // inclinations; B holds the reconstructed four/eight-ray motif. No coverage
  // can be created here: both terms are clipped by the caller's original mask.
  const halfVariance = footprint ? footprint[0].dot(footprint[0]).add(footprint[1].dot(footprint[1])).div(24) : float(0);
  const starNormal = normal.add(tangent.mul(stars.r.sub(.5))).add(bitangent.mul(stars.g.sub(.5))).normalize();
  const broadening = halfVariance.mul(38).add(1);
  const alignment = starNormal.dot(momentum.normalize()).max(0);
  const flash = alignment.pow(float(38).div(broadening)).div(broadening).mul(stars.b, 7);
  return spectral.add(flash).mul(normal.dot(light).max(0), normal.dot(view).max(0));
}
