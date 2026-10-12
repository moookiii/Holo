import type { Node } from 'three/webgpu';
import { vec3, exp } from 'three/tsl';
import { spectrum } from './DiffractionLayer';
import type { IllustrationRareOptics } from './IllustrationRareLayer';

/** Domain orientation selects reflection without changing the print normal.
 * Fixed domains exchange brightness with L+V, including finite light size. */
export function breakFoilReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: IllustrationRareOptics & { neutralGain: Node<'float'>; spectralGain: Node<'float'> }, weights: Node<'vec4'>, details: Node<'vec4'>,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const momentum = light.add(view);
  const x = momentum.dot(tangent), y = momentum.dot(bitangent);
  const variance = (axis: Node<'vec3'>) => {
    const pixel = momentum.dot(axis).fwidth().pow2().div(12);
    return footprint ? pixel.add(footprint[0].dot(axis).pow2().add(footprint[1].dot(axis).pow2()).div(3)) : pixel;
  };
  const vx = variance(tangent).add(.075 ** 2), vy = variance(bitangent).add(.19 ** 2);
  const lobe = (sx: number, sy: number) => exp(x.sub(sx).pow2().div(vx)
    .add(y.sub(sy).pow2().div(vy)).mul(-.5)).mul(.075 * .19).div(vx.mul(vy).sqrt());
  const silver = lobe(-.32, -.12).mul(weights.r).add(lobe(.32, .12).mul(weights.a))
    .add(lobe(-.10, .36).mul(weights.g)).add(lobe(.10, -.36).mul(weights.b));
  const fine = lobe(0, 0).mul(details.a, .32);
  const neutral = silver.add(fine).mul(3.2, u.neutralGain);
  const spectral = spectrum(x.abs().mul(u.period), u.bandwidth, u.secondary,
    variance(tangent).mul(u.period.pow2())).mul(silver.add(fine), u.strength, u.spectralGain);
  return vec3(neutral).add(spectral).mul(normal.dot(light).max(0), normal.dot(view).max(0).sqrt());
}
