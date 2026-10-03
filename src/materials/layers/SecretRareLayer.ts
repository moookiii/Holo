import type { Node } from 'three/webgpu';
import { cos, exp, float, fract, sin, uv, vec2, vec3 } from 'three/tsl';
import { spectrum } from './DiffractionLayer';

/** Box integral of a periodic die opening. Integrate before shading rather than
 * sampling hairlines and hoping that texture mipmaps preserve their energy. */
export function filteredCut(coordinate: Node<'float'>, duty: Node<'float'>) {
  const width = coordinate.fwidth().max(.0001);
  const integral = (x: Node<'float'>) => x.floor().mul(duty).add(fract(x).min(duty));
  return integral(coordinate.add(width.mul(.5))).sub(integral(coordinate.sub(width.mul(.5)))).div(width).clamp(0, 1);
}

export interface SecretOptics {
  scale: Node<'float'>; aspect: Node<'float'>; cutAngle: Node<'float'>; cutWidth: Node<'float'>;
  facetTilt: Node<'float'>; period: Node<'float'>; bandwidth: Node<'float'>;
  strength: Node<'float'>; secondary: Node<'float'>; angle: Node<'float'>;
  crossWidth: Node<'float'>; roughness: Node<'float'>;
}

/** Three interleaved rows of stamped, segmented ribbons, fixed in card space.
 * No random particles, animated phase, height-from-print or texture sampling.
 * Visible cuts and the sub-visible diffraction grating have independent axes.
 * Both viewer and instanced gallery call this same optical kernel. */
export function secretRareReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: SecretOptics, footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().mul(vec2(u.aspect, 1));
  const along = vec2(cos(u.cutAngle), sin(u.cutAngle));
  const across = vec2(along.y.negate(), along.x);
  const row = p.dot(across).mul(u.scale);
  const run = p.dot(along).mul(u.scale, 1.4);
  const momentum = light.add(view), half = momentum.normalize();
  const axis = tangent.mul(cos(u.angle)).add(bitangent.mul(sin(u.angle)));
  const variance = (a: Node<'vec3'>) => footprint
    ? footprint[0].dot(a).pow2().add(footprint[1].dot(a).pow2()).div(3) : float(0);
  let result: Node<'vec3'> = vec3(0);
  for (let group = 0; group < 3; group++) {
    const ribbon = filteredCut(row.sub(group).div(3), u.cutWidth.div(3));
    // Stagger the die openings rather than lining their gaps into a second grid.
    const segment = filteredCut(run.add(row.mul(.381966)).add(group * .217), float(.54));
    // Small die inclinations select adjacent rows at different angles. These
    // are optical facet estimates, not asserted measurements of LOB relief.
    const slope = float(group - 1).mul(u.facetTilt);
    const n = normal.add(tangent.mul(slope)).add(bitangent.mul(slope.mul(-.55))).normalize();
    const grating = axis.sub(n.mul(axis.dot(n))).normalize();
    const groove = n.cross(grating).normalize();
    const path = momentum.dot(grating).abs().mul(u.period);
    const pathVariance = variance(grating).mul(u.period.pow2())
      .add(path.dFdx().pow2().add(path.dFdy().pow2()).div(12));
    const width = u.crossWidth.pow2().add(variance(groove)).sqrt();
    const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
    const color = spectrum(path, u.bandwidth, u.secondary, pathVariance).mul(aperture, u.strength);
    const rough = u.roughness.max(.035).pow2();
    const halfVariance = footprint ? variance(tangent).add(variance(bitangent)).mul(.25) : float(0);
    const lobeWidth = rough.add(halfVariance);
    const silver = exp(n.dot(half).max(0).pow2().oneMinus().div(lobeWidth).mul(-.5))
      .mul(rough.div(lobeWidth), .85);
    result = result.add(color.add(silver).mul(ribbon, segment, n.dot(light).max(0), n.dot(view).max(0).sqrt()));
  }
  return result;
}
