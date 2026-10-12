import type { Node } from 'three/webgpu';
import { float, vec2, vec3, uv, mix, sin, cos, exp } from 'three/tsl';
import { stableHash } from './PatternLayer';
import { spectrum } from './DiffractionLayer';

function grain(p: Node<'vec2'>, seed: number) {
  const cell = p.floor(), f = p.fract();
  const w = f.mul(f).mul(f.mul(-2).add(3));
  return mix(mix(stableHash(cell, seed), stableHash(cell.add(vec2(1, 0)), seed), w.x),
    mix(stableHash(cell.add(vec2(0, 1)), seed), stableHash(cell.add(1), seed), w.x), w.y);
}

interface MegaReverseOptics {
  aspect: Node<'float'>; period: Node<'float'>; bandwidth: Node<'float'>;
  strength: Node<'float'>; secondary: Node<'float'>; angle: Node<'float'>;
  crossWidth: Node<'float'>; neutralGain: Node<'float'>; spectralGain: Node<'float'>;
  inkTransmission: Node<'float'>;
}

/** Continuous optical grain on unetched ME reverse foil. Fixed card-space
 * microfacet distributions alter reflection, never printed color or geometry.
 * Pixel filtering integrates unresolved grain into the highlight width. */
export function megaReverseReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  ink: Node<'vec3'>, u: MegaReverseOptics,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const p = uv().mul(vec2(u.aspect, 1)).mul(380);
  const visible = exp(p.fwidth().dot(p.fwidth()).mul(-.35));
  const a = grain(p, 137).toVar(), b = grain(p.mul(1.71).add(13.4), 293).toVar();
  const slope = vec2(a, b).sub(.5).mul(.10, visible);
  const facet = normal.add(tangent.mul(slope.x)).add(bitangent.mul(slope.y)).normalize();
  const momentum = light.add(view), half = momentum.normalize();
  const lightVariance = footprint
    ? footprint[0].dot(footprint[0]).add(footprint[1].dot(footprint[1])).div(24) : float(0);
  // Fine texture sits beneath a slick film: keep its continuous reflection
  // tight instead of spreading every grain into a broad, chalky wash.
  const alpha = mix(float(.145), a.mul(.05).add(.12), visible);
  const alpha2 = alpha.pow2().add(lightVariance.mul(2), visible.oneMinus().mul(.002));
  const nh2 = facet.dot(half).max(0).pow2();
  const distribution = alpha2.div(nh2.mul(alpha2.sub(1)).add(1).pow2().mul(Math.PI));
  const nl = normal.dot(light).max(0), nv = normal.dot(view).max(0);
  const k = alpha.add(1).pow2().div(8);
  const visibility = float(1).div(nl.mul(k.oneMinus()).add(k)
    .mul(nv.mul(k.oneMinus()).add(k), 4).max(.001));
  const fresnel = half.dot(view).max(0).oneMinus().pow(5).mul(.92).add(.08);
  const silver = distribution.mul(visibility, fresnel, mix(float(1), b.mul(.28).add(.86), visible));
  // One sheet grating with a small optical spread: grain does not become
  // independent rainbow dots. The same reflection carries the colored lobe.
  const sheet = tangent.mul(cos(u.angle)).add(bitangent.mul(sin(u.angle)));
  const axis = sheet.sub(normal.mul(sheet.dot(normal))).normalize();
  const groove = normal.cross(axis).normalize();
  const variance = footprint
    ? footprint[0].dot(axis).pow2().add(footprint[1].dot(axis).pow2()).div(3) : float(0);
  const width = u.crossWidth.pow2().add(lightVariance.mul(8)).sqrt();
  const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
  const color = spectrum(momentum.dot(axis).abs().mul(u.period), u.bandwidth, u.secondary,
    variance.mul(u.period.pow2()).add(visible.oneMinus().mul(.001)));
  const tint = vec3(.76, .79, .82).mul(u.neutralGain)
    .add(color.mul(aperture, u.strength, u.spectralGain, 2.8));
  const filter = mix(vec3(1), ink.mul(.985).add(.015), u.inkTransmission);
  return tint.mul(silver, filter, nl, nv.sqrt(), 3.6);
}
