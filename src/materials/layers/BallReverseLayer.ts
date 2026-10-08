import type { Node } from 'three/webgpu';
import { float, vec2, vec3, uv, sin, cos, exp, mix } from 'three/tsl';
import { spectrum } from './DiffractionLayer';
import { glints } from './GlintLayer';
import type { IllustrationRareOptics } from './IllustrationRareLayer';

export interface BallReverseOptics extends IllustrationRareOptics {
  density: Node<'float'>; glintScale: Node<'float'>; sharpness: Node<'float'>;
  glintStrength: Node<'float'>; spread: Node<'float'>;
}

/** Cast-and-cure optical film. The supplied pattern clips this response at the
 * caller; the continuous silver backing keeps its independent reflection.
 * Smooth optical domains redirect wavelengths without changing surface normals.
 * B is the offline cap-interior mask, never relief or generated symbol geometry.
 */
export function ballReverseReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: BallReverseOptics, field: Node<'vec4'>, seed: number | Node<'float'>,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().sub(.5).mul(vec2(u.aspect, 1));
  const axis = vec2(cos(u.angle), sin(u.angle));
  const sheet = tangent.mul(axis.x).add(bitangent.mul(axis.y));
  const inclination = sin(p.y.mul(7.5).add(p.x.mul(2.1))).mul(.16)
    .add(sin(p.x.mul(4.2).sub(p.y.mul(2))).mul(.045));
  const opticalNormal = normal.add(sheet.mul(inclination)).normalize();
  const grating = sheet.sub(opticalNormal.mul(sheet.dot(opticalNormal))).normalize();
  const groove = opticalNormal.cross(grating).normalize();
  const momentum = light.add(view);
  const variance = (a: Node<'vec3'>) => footprint
    ? footprint[0].dot(a).pow2().add(footprint[1].dot(a).pow2()).div(3) : float(0);
  const width = u.crossWidth.pow2().add(variance(groove)).sqrt();
  const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
  const color = spectrum(momentum.dot(grating).abs().mul(u.period), u.bandwidth,
    u.secondary, variance(grating).mul(u.period.pow2()));
  const halfVariance = footprint ? footprint[0].dot(footprint[0]).add(footprint[1].dot(footprint[1])).div(24) : float(0);
  const broadening = halfVariance.mul(u.sharpness).add(1);
  const grain = glints(light, { density: u.density, scale: u.glintScale,
    sharpness: u.sharpness.div(broadening), strength: u.glintStrength.div(broadening),
    spread: u.spread, aspect: u.aspect, metallicGrain: true, filterMetallicGrain: true }, seed);
  // Fine flashes concentrate in the filled caps. Thin outlines retain a smooth
  // spectral sheen; subpixel grains integrate instead of crawling during tilt.
  const spectral = color.mul(aperture, u.strength);
  const sparkle = grain.mul(field.b, mix(vec3(1), color.mul(2).add(.12), float(.72)));
  return spectral.add(sparkle).mul(normal.dot(light).max(0), normal.dot(view).max(0).sqrt());
}
