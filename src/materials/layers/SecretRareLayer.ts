import type { Node } from 'three/webgpu';
import { cos, exp, float, sin, uv, vec2, vec3 } from 'three/tsl';
import { spectrum } from './DiffractionLayer';

export interface SecretOptics {
  scale: Node<'float'>; aspect: Node<'float'>; cutAngle: Node<'float'>; cutWidth: Node<'float'>;
  facetTilt: Node<'float'>; period: Node<'float'>; bandwidth: Node<'float'>;
  strength: Node<'float'>; secondary: Node<'float'>; angle: Node<'float'>;
  crossWidth: Node<'float'>; roughness: Node<'float'>;
  spectralGain?: Node<'float'>; neutralGain?: Node<'float'>;
}

/** Continuous directional foil substrate. Spatial variation changes the local
 * optical frame, never coverage: a zone exists only when its BRDF reflects the
 * light toward the viewer. There is no visible line, hatch or cut mask.
 * Coordinates are fixed to the card; light/view momentum moves the reflections.
 */
export function secretRareReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: SecretOptics, footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().sub(.5).mul(vec2(u.aspect, 1));
  const along = vec2(cos(u.cutAngle), sin(u.cutAngle));
  const across = vec2(along.y.negate(), along.x);
  const x = p.dot(across), y = p.dot(along);
  // Broad, non-repeating optical domains. This is orientation variation in a
  // laminated film, not geometric emboss or an intensity stripe texture.
  const domain = x.mul(5.4).add(sin(y.mul(7.1)).mul(.24));
  const slope = domain.mul(.24).add(sin(x.mul(13).add(y.mul(2.3))).mul(.045));
  const n = normal.add(tangent.mul(slope)).add(bitangent.mul(slope.mul(-.65))).normalize();
  const axisAngle = u.angle.add(domain.mul(.27));
  const axis = tangent.mul(cos(axisAngle)).add(bitangent.mul(sin(axisAngle)));
  const grating = axis.sub(n.mul(axis.dot(n))).normalize();
  const groove = n.cross(grating).normalize();
  const momentum = light.add(view), half = momentum.normalize();
  const variance = (a: Node<'vec3'>) => footprint
    ? footprint[0].dot(a).pow2().add(footprint[1].dot(a).pow2()).div(3) : float(0);
  const path = momentum.dot(grating).abs().mul(u.period);
  const pathVariance = variance(grating).mul(u.period.pow2())
    .add(path.dFdx().pow2().add(path.dFdy().pow2()).div(12));
  const width = u.crossWidth.pow2().add(variance(groove)).sqrt();
  const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
  const color = spectrum(path, u.bandwidth, u.secondary, pathVariance)
    .mul(aperture, u.strength, u.spectralGain ?? float(1));
  const rough = u.roughness.max(.035).pow2();
  const lobeWidth = rough.add(variance(tangent).add(variance(bitangent)).mul(.25));
  const silver = exp(n.dot(half).max(0).pow2().oneMinus().div(lobeWidth).mul(-.5))
    .mul(rough.div(lobeWidth), .24, u.neutralGain ?? float(1));
  return color.add(silver).mul(n.dot(light).max(0), n.dot(view).max(0).sqrt());
}
