import type { Node } from 'three/webgpu';
import { cos, exp, float, fract, mix, sin, uv, vec2 } from 'three/tsl';
import { spectrum } from './DiffractionLayer';

export interface SecretOptics {
  scale: Node<'float'>; aspect: Node<'float'>; cutAngle: Node<'float'>; cutWidth: Node<'float'>;
  facetTilt: Node<'float'>; period: Node<'float'>; bandwidth: Node<'float'>;
  strength: Node<'float'>; secondary: Node<'float'>; angle: Node<'float'>;
  crossWidth: Node<'float'>; roughness: Node<'float'>;
  spectralGain?: Node<'float'>; neutralGain?: Node<'float'>;
}

/** Close-packed staggered foil facets inside a continuous directional substrate.
 * Each broad brick face redirects a portion of the reflection. The narrow seams
 * are the minority area, unlike the rejected thin ribbons on a mostly empty sheet.
 * Coordinates are fixed to the card; light/view momentum moves the reflections.
 */
export function secretRareReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: SecretOptics, footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().sub(.5).mul(vec2(u.aspect, 1));
  const along = vec2(cos(u.cutAngle), sin(u.cutAngle));
  const across = vec2(along.y.negate(), along.x);
  const x = p.dot(across), y = p.dot(along);
  const row = x.mul(u.scale), run = y.mul(u.scale).div(1.8);
  const rowIndex = row.floor();
  const stagger = rowIndex.mod(2).mul(.5);
  const brick = vec2(run.add(stagger).floor(), rowIndex);
  const phase = fract(sin(brick.dot(vec2(12.9898, 78.233))).mul(43758.5453));
  // Derivatives come from continuous coordinates, never floor/hash boundaries.
  const footprintSize = row.fwidth().max(run.fwidth());
  const resolved = footprintSize.smoothstep(.45, 1.4).oneMinus();
  const facetSlope = phase.sub(.5).mul(u.facetTilt, resolved);
  const opening = (coordinate: Node<'float'>, width: Node<'float'>) => {
    const w = width.max(.0001), duty = u.cutWidth.clamp(.7, .98);
    const integral = (v: Node<'float'>) => v.floor().mul(duty).add(fract(v).min(duty));
    return integral(coordinate.add(w.mul(.5))).sub(integral(coordinate.sub(w.mul(.5)))).div(w).clamp(0, 1);
  };
  const face = opening(row, row.fwidth()).mul(opening(run.add(stagger), run.fwidth()));
  // Broad, non-repeating optical domains. This is orientation variation in a
  // laminated film, not geometric emboss or an intensity stripe texture.
  const domain = x.mul(5.4).add(sin(y.mul(7.1)).mul(.24));
  const slope = domain.mul(.24).add(sin(x.mul(13).add(y.mul(2.3))).mul(.045)).add(facetSlope);
  const n = normal.add(tangent.mul(slope)).add(bitangent.mul(slope.mul(-.65))).normalize();
  const axisAngle = u.angle.add(domain.mul(.27)).add(facetSlope.mul(.8));
  const axis = tangent.mul(cos(axisAngle)).add(bitangent.mul(sin(axisAngle)));
  const grating = axis.sub(n.mul(axis.dot(n))).normalize();
  const groove = n.cross(grating).normalize();
  const momentum = light.add(view), half = momentum.normalize();
  const variance = (a: Node<'vec3'>) => footprint
    ? footprint[0].dot(a).pow2().add(footprint[1].dot(a).pow2()).div(3) : float(0);
  const path = momentum.dot(grating).abs().mul(u.period);
  // Unresolved brick inclinations broaden the lobe instead of sparkling. Do not
  // differentiate the discrete facet normals (that creates false seam glows).
  const pathVariance = variance(grating).mul(u.period.pow2())
    .add(resolved.oneMinus().mul(u.facetTilt.pow2(), u.period.pow2(), .08));
  const width = u.crossWidth.pow2().add(variance(groove)).sqrt();
  const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
  const color = spectrum(path, u.bandwidth, u.secondary, pathVariance)
    .mul(aperture, u.strength, u.spectralGain ?? float(1));
  const rough = u.roughness.max(.035).pow2();
  const lobeWidth = rough.add(variance(tangent).add(variance(bitangent)).mul(.25));
  const silver = exp(n.dot(half).max(0).pow2().oneMinus().div(lobeWidth).mul(-.5))
    .mul(rough.div(lobeWidth), .24, u.neutralGain ?? float(1));
  const packing = mix(float(.2), float(1), face);
  return color.add(silver).mul(packing, n.dot(light).max(0), n.dot(view).max(0).sqrt());
}
