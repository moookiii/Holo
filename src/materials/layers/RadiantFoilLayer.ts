import type { Node } from 'three/webgpu';
import { exp, vec3 } from 'three/tsl';
import { spectrum } from './DiffractionLayer';
import type { IllustrationRareOptics } from './IllustrationRareLayer';

/** Radiant lower-card foil. RG is the original TCGL crossed optical stock,
 * resampled offline into full-card coordinates. It selects optical inclinations
 * only; the material normal and the character's exact etch are never modified.
 * No scrolling UVs, generated lattice, random grain or height emboss. */
export function radiantFoilReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: IllustrationRareOptics, stock: Node<'vec4'>,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const a = tangent.add(bitangent).normalize(), b = tangent.sub(bitangent).normalize();
  const momentum = light.add(view);
  const variance = (axis: Node<'vec3'>) => {
    const pixel = momentum.dot(axis).fwidth().pow2().div(12);
    return footprint ? pixel.add(footprint[0].dot(axis).pow2().add(footprint[1].dot(axis).pow2()).div(3)) : pixel;
  };
  const vx = variance(a).add(.01), vy = variance(b).add(.01);
  const x = momentum.dot(a).sub(stock.r.sub(.5).mul(1.8));
  const y = momentum.dot(b).sub(stock.g.sub(.5).mul(1.8));
  const silver = exp(x.pow2().div(vx).mul(-.5)).mul(.1).div(vx.sqrt())
    .add(exp(y.pow2().div(vy).mul(-.5)).mul(.1).div(vy.sqrt())).mul(.45);
  const spectral = spectrum(momentum.dot(a).abs().mul(u.period), u.bandwidth,
    u.secondary, variance(a).mul(u.period.pow2())).mul(u.strength, silver);
  return spectral.add(vec3(1).mul(silver)).mul(stock.a,
    normal.dot(light).max(0), normal.dot(view).max(0).sqrt());
}
