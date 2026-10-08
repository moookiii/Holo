import type { Node } from 'three/webgpu';
import { cos, sin, exp, float, mix, vec3 } from 'three/tsl';
import { spectrum } from './DiffractionLayer';
import type { UltraRareOptics } from './UltraRareLayer';

/** Monochrome BWR foil. Exact TCGL normals are the only relief. The etched
 * reference's grating, aperture and ink-ridge lobe are retained. These cards
 * expose a silver carrier through the monochrome ink: black/red print must not
 * extinguish its moving rainbow. This transmission correction affects reflected
 * light only; neither the clean front nor its physical surface is recolored.
 */
export function blackWhiteRareReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, geometry: Node<'vec3'>,
  normal: Node<'vec3'>, ink: Node<'vec3'>, u: UltraRareOptics,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const sheet = tangent.mul(cos(u.angle)).add(bitangent.mul(sin(u.angle)));
  const grating = sheet.sub(normal.mul(sheet.dot(normal))).normalize();
  const groove = normal.cross(grating).normalize();
  const momentum = light.add(view), half = momentum.normalize();
  const variance = (axis: Node<'vec3'>) => footprint
    ? footprint[0].dot(axis).pow2().add(footprint[1].dot(axis).pow2()).div(3) : float(0);
  const width = u.crossWidth.pow2().add(variance(groove)).sqrt();
  const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
  const color = spectrum(momentum.dot(grating).abs().mul(u.period), u.bandwidth,
    u.secondary, variance(grating).mul(u.period.pow2()));
  const transmission = mix(vec3(1), ink.mul(.30).add(.70), u.inkTransmission);
  const spectral = color.mul(aperture, u.strength, transmission);
  const halfVariance = footprint
    ? footprint[0].dot(footprint[0]).add(footprint[1].dot(footprint[1])).div(24) : float(0);
  const broadening = halfVariance.mul(150).add(1);
  const ridgeLobe = normal.dot(half).max(0).pow(float(150).div(broadening)).div(broadening);
  const ridge = normal.sub(geometry).length().smoothstep(.008, .075);
  const silver = ink.mul(ridgeLobe, ridge, u.etchedInkSheen,
    geometry.dot(half).smoothstep(.90, .98));
  return spectral.add(silver).mul(normal.dot(light).max(0), normal.dot(view).max(0).sqrt());
}
