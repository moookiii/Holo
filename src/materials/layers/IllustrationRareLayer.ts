import type { Node } from 'three/webgpu';
import { float, vec2, uv, sin, cos, exp } from 'three/tsl';
import { spectrum } from './DiffractionLayer';

export interface IllustrationRareOptics {
  aspect: Node<'float'>; period: Node<'float'>; bandwidth: Node<'float'>;
  strength: Node<'float'>; secondary: Node<'float'>; angle: Node<'float'>; crossWidth: Node<'float'>;
}

/** Smooth SV151 IR foil. One graph for viewer and instanced gallery.
 * Sheet coordinates describe optical grating variation, never a colored texture
 * or embossed surface. No clock, screen position, artwork-derived normal or RNG.
 */
export function illustrationRareReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: IllustrationRareOptics, footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().sub(.5).mul(vec2(u.aspect, 1));
  const axis = vec2(cos(u.angle), sin(u.angle));
  const across = p.dot(axis), along = p.dot(vec2(axis.y.negate(), axis.x));
  // Unequal, gently distorted optical domains in a continuous sheet. The
  // inclinations only redirect diffraction; the laminate remains physically flat.
  const phase = across.mul(17).add(sin(along.mul(5).add(.6)).mul(.27));
  const inclination = sin(phase).mul(.17).add(sin(across.mul(7).sub(along.mul(2)).add(1.3)).mul(.065));
  const angle = u.angle.add(sin(along.mul(6).add(across.mul(3))).mul(.035));
  const sheetAxis = tangent.mul(cos(angle)).add(bitangent.mul(sin(angle)));
  const n = normal.add(sheetAxis.mul(inclination)).normalize();
  const grating = sheetAxis.sub(n.mul(sheetAxis.dot(n))).normalize();
  const groove = n.cross(grating).normalize();
  const momentum = light.add(view);
  const spacing = sin(across.mul(9).add(along.mul(3))).mul(.025).add(1);
  const path = momentum.dot(grating).abs().mul(u.period, spacing);
  const variance = (a: Node<'vec3'>) => footprint
    ? footprint[0].dot(a).pow2().add(footprint[1].dot(a).pow2()).div(3) : float(0);
  const width = u.crossWidth.pow2().add(variance(groove)).sqrt();
  const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
  // Fine striae are energy modulation only, analytically filtered at distance.
  const microPhase = across.mul(2 * Math.PI * 920).add(sin(along.mul(73)).mul(.3));
  const micro = cos(microPhase).mul(exp(microPhase.fwidth().pow2().mul(-.5)), .025).add(.975);
  const incident = normal.dot(light).max(0), visible = normal.dot(view).max(0).sqrt();
  return spectrum(path, u.bandwidth, u.secondary, variance(grating).mul(u.period.mul(spacing).pow2()))
    .mul(aperture, micro, incident, visible, u.strength);
}
