import type { Node } from 'three/webgpu';
import { uv, vec2, vec3, float, exp, mix, normalView, positionViewDirection } from 'three/tsl';
import type { OpticalUniforms } from '../OpticalUniforms';
import { stableHash } from './PatternLayer';
import { spectrum } from './DiffractionLayer';

/** Crossed embossed microprisms. Geometry lives in card UVs; only the BRDF
 * depends on the emitter/view. Correlated inclinations produce broken glints,
 * never a translated mask or a periodically illuminated macro grid. */
export function crossedFacets(light: Node<'vec3'>, tangent: Node<'vec3'>, bitangent: Node<'vec3'>,
  normal: Node<'vec3'>, field: Node<'vec4'>, details: Node<'vec4'>, u: OpticalUniforms, seed: number,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().mul(vec2(u.aspect, 1));
  const momentum = light.add(positionViewDirection).toVar();
  const half = momentum.normalize().toVar();
  const hz = half.dot(normal).max(.12).toVar();
  const slope = vec2(half.dot(tangent), half.dot(bitangent)).div(hz).toVar();
  // The atlas stores manufacturing inclinations, not brightness. Authored
  // normal/height maps can bend the foil without detaching it from the print.
  const authored = vec2(normalView.dot(tangent), normalView.dot(bitangent));
  const sheet = details.rg.sub(.5).mul(u.facetTilt, 2).add(authored).toVar();
  const variance = (axis: Node<'vec3'>) => footprint
    ? footprint[0].dot(axis).pow2().add(footprint[1].dot(axis).pow2()).div(12).div(hz.pow2()) : float(0);
  const lightVariance = vec2(variance(tangent), variance(bitangent));
  const result = vec3(0).toVar();
  for (const vertical of [false, true]) {
    const point = vertical ? p.yx : p;
    const lattice = point.mul(u.scale).mul(vec2(.38, 1.43));
    // Offset each row independently: short facets never line up into a tiled lattice.
    const row = lattice.y.floor();
    const shifted = lattice.add(vec2(stableHash(vec2(row, 9), seed + 311), 0)).toVar();
    const cell = shifted.floor();
    const r = stableHash(cell, seed + (vertical ? 491 : 127)).toVar();
    const s = stableHash(cell, seed + (vertical ? 617 : 283)).toVar();
    const local = shifted.fract().sub(vec2(.5, s.sub(.5).mul(.32).add(.5)));
    const size = vec2(r.mul(.21).add(.25), s.mul(.085).add(.075));
    const pixel = lattice.fwidth().max(.001).toVar();
    // Exact box/pixel overlap keeps subpixel cuts fine at distance and grazing.
    const lo = local.sub(pixel.mul(.5)).max(size.negate());
    const hi = local.add(pixel.mul(.5)).min(size);
    const area = hi.sub(lo).max(0).div(pixel);
    // Once several cells fit inside one pixel, converge to their covered area.
    // Sampling just the current cell would lose energy and shimmer edge-on.
    const resolved = pixel.x.max(pixel.y).smoothstep(.65, 1.8).oneMinus();
    const shape = mix(size.x.mul(size.y, 4), area.x.mul(area.y), resolved);
    const jitter = vec2(r.sub(.5).mul(u.spread, 2), s.sub(.5).mul(.055));
    const mean = vertical ? sheet.yx : sheet;
    const facetSlope = mean.add(jitter).toVar();
    const localSlope = vertical ? slope.yx : slope;
    const delta = localSlope.sub(facetSlope);
    const intrinsic = float(1).div(u.sharpness.max(1)).mul(r.mul(.7).add(.65)).toVar();
    const broadening = (vertical ? lightVariance.yx : lightVariance).add(intrinsic).toVar();
    const exponent = delta.pow2().div(broadening);
    const peak = exp(exponent.x.add(exponent.y).mul(-.5)).mul(intrinsic.div(broadening.x.mul(broadening.y).sqrt()));
    const facet = normal.add((vertical ? bitangent : tangent).mul(facetSlope.x))
      .add((vertical ? tangent : bitangent).mul(facetSlope.y)).normalize().toVar();
    const axis = (vertical ? bitangent : tangent);
    const grating = axis.sub(facet.mul(axis.dot(facet))).normalize().toVar();
    const groove = facet.cross(grating).normalize().toVar();
    const path = momentum.dot(grating).abs().mul(u.period, field.b.mul(1.5).add(.5)).toVar();
    const transverseWidth = intrinsic.mul(12).add(variance(groove).mul(4)).sqrt();
    const aperture = exp(momentum.dot(groove).div(transverseWidth).pow2().mul(-.5));
    const color = spectrum(path, u.bandwidth, u.secondary, variance(grating).mul(4, u.period.pow2()).toVar());
    const incident = facet.dot(light).max(0);
    const visibility = normal.dot(positionViewDirection).max(0).smoothstep(0, .16);
    // Silver is dominant at mirror alignment; spectral orders only live on
    // the inclined cuts, not on a rainbow overlay spanning the artwork.
    const response = vec3(1, .985, .96).mul(peak, u.glintStrength, u.sparkleGain)
      .add(color.mul(aperture, u.strength, u.spectralGain, 5));
    result.addAssign(response.mul(shape, incident, visibility, vertical ? .38 : .62));
  }
  return result;
}
