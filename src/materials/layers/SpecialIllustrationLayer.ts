import type { Node } from 'three/webgpu';
import { float, vec2, vec3, uv, mix, exp, sin, cos } from 'three/tsl';
import { stableHash } from './PatternLayer';
import { spectrum } from './DiffractionLayer';

/** Continuous patch envelopes, fixed to full-card UVs, never to time or art. */
function patchNoise(p: Node<'vec2'>, seed: number) {
  const cell = p.floor(), f = p.fract();
  const w = f.mul(f).mul(f.mul(-2).add(3));
  return mix(mix(stableHash(cell, seed), stableHash(cell.add(vec2(1, 0)), seed), w.x),
    mix(stableHash(cell.add(vec2(0, 1)), seed), stableHash(cell.add(1), seed), w.x), w.y);
}

export interface SpecialIllustrationOptics {
  aspect: Node<'float'>; strength: Node<'float'>; inkTransmission: Node<'float'>;
}

/** 151 SIR: an irregular reflective foil field, NOT a height/emboss generator.
 * TCGL normals remain the only relief. Fixed microreflectors have distributed
 * optical orientations; finite light size and pixel footprint integrate them.
 * Both production renderers call this exact kernel at every presentation size.
 */
export function specialIllustrationReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, geometry: Node<'vec3'>,
  normal: Node<'vec3'>, ink: Node<'vec3'>, u: SpecialIllustrationOptics,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().mul(vec2(u.aspect, 1));
  const cluster = patchNoise(p.mul(29), 17).toVar();
  const drift = patchNoise(p.mul(19).add(3.7), 83).toVar();
  const lattice = p.mul(680);
  const cell = lattice.floor();
  const r = stableHash(cell, 113).toVar(), s = stableHash(cell, 271).toVar();
  const grain = stableHash(cell, 419).toVar();
  // Correlated inclinations make medium reflective patches; independent fine
  // inclinations break each patch into many tiny, angle-selected reflections.
  const tilt = vec2(cluster, drift).sub(.5).mul(.55);
  const slope = vec2(r, s).sub(.5).mul(.72).add(tilt);
  const facet = normal.add(tangent.mul(slope.x)).add(bitangent.mul(slope.y)).normalize();
  const half = light.add(view).normalize();
  const lightVariance = footprint
    ? footprint[0].dot(footprint[0]).add(footprint[1].dot(footprint[1])).div(24) : float(0);
  const variance = lightVariance.add(.0028);
  const lobe = exp(facet.dot(half).max(0).oneMinus().div(variance).negate())
    .mul(float(.0028).div(variance));
  const broadFacet = normal.add(tangent.mul(tilt.x)).add(bitangent.mul(tilt.y)).normalize();
  const broadVariance = variance.add(.043);
  const average = exp(broadFacet.dot(half).max(0).oneMinus().div(broadVariance).negate())
    .mul(float(.0028).div(broadVariance));
  // Unresolved grains converge to the distribution's energy, avoiding crawling
  // points or a different low-resolution gallery sparkle implementation.
  const resolved = lattice.fwidth().length().smoothstep(.7, 2.8).oneMinus();
  const silver = mix(average, lobe.mul(grain.mul(1.3).add(.35)), resolved);
  const angle = cluster.mul(5.8).add(drift.mul(2.4));
  const axis = tangent.mul(cos(angle)).add(bitangent.mul(sin(angle)));
  const path = light.add(view).dot(axis).abs().mul(1.12);
  const color = spectrum(path, float(.065), float(.035), lightVariance.mul(2));
  // White/silver is the carrier. Spectral energy belongs to the same patches,
  // with no global directional band and no emissive or printed noise overlay.
  const tint = vec3(.90, .92, .94).add(color.mul(.38));
  const envelope = cluster.mul(.9).add(.55);
  const filter = mix(vec3(1), ink.mul(.97).add(.03), u.inkTransmission);
  return tint.mul(silver, envelope, 8, u.strength, filter,
    geometry.dot(light).max(0), geometry.dot(view).max(0).sqrt());
}
