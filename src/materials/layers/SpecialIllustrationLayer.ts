import type { Node } from 'three/webgpu';
import { float, vec2, vec3, uv, mix, sin, cos } from 'three/tsl';
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

/** Continuous foil distributions, not individually selected glints.
 * Every texel contains optical slope and roughness. The exact TCGL map is still
 * the only etched relief. A single mipmapped field is shared by both renderers;
 * no particle occupancy, angular cutoff, runtime RNG or screen-space pattern.
 */
export function specialIllustrationReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, geometry: Node<'vec3'>,
  normal: Node<'vec3'>, ink: Node<'vec3'>, u: SpecialIllustrationOptics,
  micrograin: Node<'vec4'>,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().mul(vec2(u.aspect, 1));
  const cluster = patchNoise(p.mul(29), 17).toVar();
  const drift = patchNoise(p.mul(19).add(3.7), 83).toVar();
  // Large patches change orientation, never micrograin coverage. The fine
  // distributions overlap across the entire allowed foil region.
  const tilt = vec2(cluster, drift).sub(.5).mul(.42);
  const slope = micrograin.rg.sub(.5).mul(.52).add(tilt);
  const facet = normal.add(tangent.mul(slope.x)).add(bitangent.mul(slope.y)).normalize();
  const half = light.add(view).normalize();
  const lightVariance = footprint
    ? footprint[0].dot(footprint[0]).add(footprint[1].dot(footprint[1])).div(24) : float(0);
  // Broad, long-tailed GGX distributions keep every illuminated texel active.
  // Narrow exponentials previously selected isolated bright points with dark
  // gaps. Roughness and small optical slopes now vary a continuous BRDF.
  const alpha = micrograin.b.mul(.18).add(.16);
  const alpha2 = alpha.pow2().add(lightVariance.mul(2));
  const nh2 = facet.dot(half).max(0).pow2();
  const distribution = alpha2.div(nh2.mul(alpha2.sub(1)).add(1).pow2().mul(Math.PI));
  const broad2 = alpha2.add(.14);
  const broad = broad2.div(nh2.mul(broad2.sub(1)).add(1).pow2().mul(Math.PI));
  const nl = geometry.dot(light).max(0), nv = geometry.dot(view).max(0);
  const k = alpha.add(1).pow2().div(8);
  const visibility = float(1).div(nl.mul(k.oneMinus()).add(k)
    .mul(nv.mul(k.oneMinus()).add(k), 4).max(.001));
  const fresnel = half.dot(view).max(0).oneMinus().pow(5).mul(.94).add(.06);
  // Continuous reflectance variation, bounded away from zero. This survives
  // between bright patches; it is never a threshold selecting isolated dots.
  const reflectance = micrograin.b.mul(1.5).add(.25);
  const silver = distribution.mul(.72).add(broad.mul(.28)).mul(visibility, fresnel, reflectance);
  const angle = cluster.mul(5.8).add(drift.mul(2.4));
  const axis = tangent.mul(cos(angle)).add(bitangent.mul(sin(angle)));
  const path = light.add(view).dot(axis).abs().mul(1.12);
  const color = spectrum(path, float(.065), float(.035), lightVariance.mul(2));
  // White/silver is the carrier. Spectral energy belongs to the same patches,
  // with no global directional band and no emissive or printed noise overlay.
  const tint = vec3(.82, .85, .88).add(color.mul(.65));
  const envelope = cluster.mul(.5).add(.75);
  const filter = mix(vec3(1), ink.pow(1.4).mul(.99).add(.01), u.inkTransmission);
  return tint.mul(silver, envelope, 8, u.strength, filter, nl, nv.sqrt());
}
