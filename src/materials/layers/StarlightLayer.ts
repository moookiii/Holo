import type { Node } from 'three/webgpu';
import { float, vec2, uv } from 'three/tsl';
import { stableHash } from './PatternLayer';
import { spectrum } from './DiffractionLayer';
import type { OpticalUniforms } from '../OpticalUniforms';

/** Interrupted ladder cuts fixed in card coordinates. */
export function starlightGridReflection(momentum: Node<'vec3'>, tangent: Node<'vec3'>,
  bitangent: Node<'vec3'>, grid: Node<'float'>, u: OpticalUniforms, seed: number) {
  const point = uv().mul(vec2(u.aspect, 1));
  // Horizontal punch rows form the wide grid's vertical ladders and crossbars.
  // Jitter only the individual cut, never the large square grid.
  const rows = point.mul(vec2(u.scale.mul(.72), u.scale));
  const rowCell = rows.floor(), r = stableHash(rowCell, seed + 271);
  const rowLocal = rows.fract().sub(vec2(r.mul(.2).add(.4), .5));
  const rowAA = rows.fwidth().mul(.5).max(.015);
  const dashX = rowLocal.x.abs().smoothstep(float(.28).sub(rowAA.x), float(.28).add(rowAA.x)).oneMinus();
  const dashY = rowLocal.y.abs().smoothstep(float(.11).sub(rowAA.y), float(.11).add(rowAA.y)).oneMinus();
  const dash = dashX.mul(dashY, r.smoothstep(.06, .22));
  const angularPath = momentum.dot(tangent).mul(.21).add(momentum.dot(bitangent).mul(.16));
  const sheetPath = angularPath.add(point.x.mul(.35)).add(point.y.mul(.16)).add(.34 + (seed % 23) * .003);
  const cutColor = spectrum(sheetPath.add(r.sub(.5).mul(.045)), float(.035), float(.18)).mul(3.8).add(.055);
  return cutColor.mul(dash, grid.mul(5.8).add(.12), u.strength);
}
