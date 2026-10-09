import type { Node } from 'three/webgpu';
import { float, vec2, vec3, exp } from 'three/tsl';
import { spectrum } from './DiffractionLayer';
import type { IllustrationRareOptics } from './IllustrationRareLayer';

/** Authored optical stock, never relief. Classic: RG double-angle axis, B period.
 * Pikachu: RG oriented axis, B signed optical inclination. A is motif coverage.
 * No inferred positions, time or noise.
 * Transparent pixels are absent motifs, including the pending-stock sentinel.
 * The caller applies card coverage/protection and printed-ink transmission once.
 */
export function celebrationFoilReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: IllustrationRareOptics, field: Node<'vec4'>, classic: boolean,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  // Recover an unoriented grating axis without atan2's wrap discontinuity.
  const doubled = field.rg.mul(2).sub(1);
  const length = doubled.length();
  const cosine = doubled.x.div(length.max(.0001)).clamp(-1, 1);
  const axis = classic ? vec2(cosine.add(1).mul(.5).sqrt(),
    cosine.oneMinus().mul(.5).sqrt().mul(doubled.y.greaterThanEqual(0).select(1, -1)))
    : doubled.div(length.max(.0001));
  const sheet = tangent.mul(axis.x).add(bitangent.mul(axis.y));
  // Pikachu's cast-and-cure foil has optical inclinations, not etched relief.
  // B stores a signed inclination; the material's geometric normal stays flat.
  const opticalNormal = classic ? normal : normal.add(sheet.mul(field.b.sub(.5).mul(1.4))).normalize();
  const projected = sheet.sub(opticalNormal.mul(sheet.dot(opticalNormal)));
  const grating = projected.div(projected.length().max(.0001));
  const groove = opticalNormal.cross(grating);
  const momentum = light.add(view);
  const variance = (a: Node<'vec3'>) => {
    const pixel = momentum.dot(a).fwidth().pow2().div(12);
    return footprint ? pixel.add(footprint[0].dot(a).pow2().add(footprint[1].dot(a).pow2()).div(3)) : pixel;
  };
  const period = classic ? u.period.mul(field.b.mul(.30).add(.85)) : u.period;
  const width = u.crossWidth.pow2().add(variance(groove)).sqrt();
  const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
  const spectral = spectrum(momentum.dot(grating).abs().mul(period), u.bandwidth,
    u.secondary, variance(grating).mul(period.pow2())).mul(aperture, u.strength);
  // Neutral cut reflection complements the spectrum. Optical direction changes
  // the selected lobe without modifying the authored geometric normal.
  const across = momentum.dot(grating), along = momentum.dot(groove);
  const sigma = classic ? float(.09) : u.strength.lessThan(1).select(.22, .13);
  const vx = variance(grating).add(sigma.pow2()), vy = variance(groove).add(.0256);
  const neutral = exp(across.pow2().div(vx).add(along.pow2().div(vy)).mul(-.5))
    .mul(sigma.mul(.16).div(vx.mul(vy).sqrt()), classic ? float(.9) : u.strength.lessThan(1).select(6, 2.2));
  return spectral.add(vec3(1).mul(neutral)).mul(field.a, length.smoothstep(.05, .2),
    normal.dot(light).max(0), normal.dot(view).max(0).sqrt());
}
