import type { Node } from 'three/webgpu';
import { float, vec3, cos, sin, exp, mix } from 'three/tsl';
import { spectrum } from './DiffractionLayer';

export interface UltraRareOptics {
  period: Node<'float'>; bandwidth: Node<'float'>; strength: Node<'float'>;
  secondary: Node<'float'>; angle: Node<'float'>; crossWidth: Node<'float'>;
  inkTransmission: Node<'float'>; etchedInkSheen: Node<'float'>;
}

/** 151 etched full-art foil, shared without a gallery approximation.
 * The sole relief is the card's offline TCGL normal. The uniform diagonal
 * grating is transported onto it; there is no generated height or facet field.
 * Color occupies the reflective lobe, leaving the metallic substrate dominant
 * away from it. Finite lights broaden both lobes without adding energy.
 */
export function ultraRareReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, geometry: Node<'vec3'>,
  normal: Node<'vec3'>, ink: Node<'vec3'>, u: UltraRareOptics,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const sheet = tangent.mul(cos(u.angle)).add(bitangent.mul(sin(u.angle)));
  const grating = sheet.sub(normal.mul(sheet.dot(normal))).normalize();
  const groove = normal.cross(grating).normalize();
  const momentum = light.add(view), half = momentum.normalize();
  const variance = (axis: Node<'vec3'>) => footprint
    ? footprint[0].dot(axis).pow2().add(footprint[1].dot(axis).pow2()).div(3) : float(0);
  const halfVariance = footprint
    ? footprint[0].dot(footprint[0]).add(footprint[1].dot(footprint[1])).div(24) : float(0);
  const width = u.crossWidth.pow2().add(variance(groove)).sqrt();
  const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
  const broadening = halfVariance.mul(32).add(1);
  const reflection = normal.dot(half).max(0).pow(float(32).div(broadening)).div(broadening);
  const color = spectrum(momentum.dot(grating).abs().mul(u.period), u.bandwidth, u.secondary,
    variance(grating).mul(u.period.pow2()));
  // Retain spectral life in highlights; this does not desaturate printed art.
  const neutral = color.dot(vec3(.2126, .7152, .0722));
  const spectral = mix(vec3(neutral), color, .68).mul(aperture, reflection, u.strength);
  const printFilter = mix(vec3(1), ink.mul(.94).add(.06), u.inkTransmission);
  const ridge = normal.sub(geometry).length().smoothstep(.008, .075);
  const ridgeBroadening = halfVariance.mul(90).add(1);
  const ridgeLobe = normal.dot(half).max(0).pow(float(90).div(ridgeBroadening)).div(ridgeBroadening);
  const silver = mix(ink, vec3(1), .22).mul(ridgeLobe, ridge, u.etchedInkSheen,
    geometry.dot(half).smoothstep(.86, .98));
  return spectral.mul(printFilter).add(silver)
    .mul(normal.dot(light).max(0), normal.dot(view).max(0).sqrt());
}
