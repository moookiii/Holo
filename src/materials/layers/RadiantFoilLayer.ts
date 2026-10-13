import type { Node } from 'three/webgpu';
import { exp, vec2, vec3, uv } from 'three/tsl';
import { spectrum } from './DiffractionLayer';
import type { IllustrationRareOptics } from './IllustrationRareLayer';

/** Fixed Radiant diamonds from the TCGL stock. Adjacent lines have successive
 * optical inclinations: light rolls their brightness, never their positions.
 * The stock is optical only; the exact character etch remains independent. */
export function radiantFoilReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: IllustrationRareOptics, stock: Node<'vec4'>,
  sampleStock: (coord: Node<'vec2'>, dx: Node<'vec2'>, dy: Node<'vec2'>) => Node<'vec4'>,
  footprint?: [Node<'vec3'>, Node<'vec3'>], centerLight?: Node<'vec3'>) {
  // Stock rows point down; the card's UV bitangent points up.
  const a = tangent.sub(bitangent).normalize();
  const b = tangent.add(bitangent).negate().normalize();
  const momentum = (centerLight ?? light).add(view);
  const p = uv().sub(.5).mul(vec2(u.aspect, -1));
  // Preserve the large diamonds resolved by the high-resolution reference.
  // Both axes use the same metric in full-card coordinates.
  // Nothing depending on light or view may enter these sampling coordinates.
  const grid = vec2(p.x.add(p.y), p.y.sub(p.x)).div(Math.SQRT2);
  // Original stock repeats twice per axis. Wrap in stock coordinates, then
  // invert the offline 45-degree registration into its central complete tile.
  // Wrapping full-card UVs would introduce a seam in this rotated texture.
  const tile = grid.add(.25).mod(.5).sub(.25);
  const sampleUv = vec2(tile.x.sub(tile.y).div(Math.SQRT2 * (6.3 / 8.8)).add(.5),
    tile.x.add(tile.y).div(-Math.SQRT2).add(.5));
  // Differentiate before periodic wrapping so tile joins cannot select a
  // coarse mip and draw dark seams across the moving grid.
  const continuousUv = uv().mul(vec2(u.aspect.div(6.3 / 8.8), 1));
  const selected = sampleStock(sampleUv, continuousUv.dFdx(), continuousUv.dFdy());
  const variance = (axis: Node<'vec3'>) => {
    const pixel = momentum.dot(axis).fwidth().pow2().div(12);
    return footprint ? pixel.add(footprint[0].dot(axis).pow2().add(footprint[1].dot(axis).pow2()).div(3)) : pixel;
  };
  // The stock's peaks lie at .25 + n * .5. Assign one inclination to each
  // complete line, including both sides of its periodic texture join. A
  // continuous angular envelope transfers light between those fixed lines;
  // multiple lamps can brighten them without creating displaced extra grids.
  const line = grid.div(.5).floor().add(.5);
  const roll = (axis: Node<'vec3'>, index: Node<'float'>) => {
    const width = variance(axis).add(.04);
    // Off -> bright -> off for each stationary line (the requested 010 fade).
    return exp(momentum.dot(axis).sub(index.mul(.65)).pow2().div(width).mul(-.5));
  };
  const x = selected.r.smoothstep(.72, .98).mul(roll(a, line.x));
  const y = selected.g.smoothstep(.72, .98).mul(roll(b, line.y));
  const silver = x.max(y).mul(.65);
  const color = (axis: Node<'vec3'>) => spectrum(momentum.dot(axis).abs().mul(u.period), u.bandwidth,
    u.secondary, variance(axis).mul(u.period.pow2()));
  const spectral = color(a).mul(x).add(color(b).mul(y))
    .div(x.add(y).max(.0001)).mul(u.strength, silver);
  return spectral.add(vec3(1).mul(silver)).mul(stock.a,
    normal.dot(light).max(0), normal.dot(view).max(0).sqrt());
}
