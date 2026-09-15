import type { Node } from 'three/webgpu';
import { uv, vec2, cos, sin, atan, exp } from 'three/tsl';

/** A periodic angular response of fixed crossed microcuts, never translated UVs.
 * The local phase identifies a group of facet orientations. Light and view select
 * which groups catch the reflection. The angular phase uses the printed-card
 * basis so reflected bands travel opposite the existing hover/arcball tilt.
 */
export function angularGrid(momentum: Node<'vec3'>, tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  aspect: Node<'float'>, scale: Node<'float'>, travel: Node<'float'>, width: Node<'float'>) {
  const p = uv().mul(vec2(aspect.mul(1.15), 1));
  const phase = p.mul(scale.mul(Math.PI * 2)).add(vec2(sin(p.y.mul(8)).mul(.18), sin(p.x.mul(11)).mul(.14)));
  const incidence = momentum.dot(normal).max(.05);
  const angle = vec2(atan(momentum.dot(tangent).negate(), incidence), atan(momentum.dot(bitangent).negate(), incidence));
  const selectedPhase = phase.add(angle.mul(travel));
  // Integrate unresolved narrow bands rather than letting them alias edge-on.
  const variance = selectedPhase.fwidth().pow2().div(12);
  const spread = variance.add(width.pow2());
  const energy = width.div(spread.sqrt());
  const lobes = exp(cos(selectedPhase).sub(1).div(spread)).mul(energy);
  return lobes.x.max(lobes.y);
}
