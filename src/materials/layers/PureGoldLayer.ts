import type { Node } from 'three/webgpu';
import { float, vec3, mix } from 'three/tsl';
import { gratingDirection } from './PatternLayer';
import type { OpticalUniforms } from '../OpticalUniforms';

/** Aggregate reflection of aligned die grooves. The offline direction PNG
 * stores the second moment of each card's exact TCGL etch, not new relief.
 * Its ellipse reflects an extended emitter as gold bands across curved cuts.
 * The existing authored tangent normal remains the only geometric response.
 */
export function pureGoldReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  field: Node<'vec4'>, u: OpticalUniforms, footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const direction = gratingDirection(field.rg, float(0));
  const across = tangent.mul(direction.x).add(bitangent.mul(direction.y));
  const along = normal.cross(across).normalize();
  const half = light.add(view).normalize();
  const variance = (axis: Node<'vec3'>) => footprint
    ? footprint[0].dot(axis).pow2().add(footprint[1].dot(axis).pow2()).div(24) : float(0);
  const ax = float(.40).pow2().add(variance(across)).sqrt();
  const ay = float(.075).pow2().add(variance(along)).sqrt();
  const nl = normal.dot(light).max(.001), nv = normal.dot(view).max(.001);
  const nh = normal.dot(half).max(0);
  const denominator = half.dot(across).div(ax).pow2().add(half.dot(along).div(ay).pow2()).add(nh.pow2());
  const distribution = float(1).div(ax.mul(ay, Math.PI, denominator.pow2()).max(.00001));
  const smith = (v: Node<'vec3'>, cosine: Node<'float'>) => float(2).div(float(1).add(
    float(1).add(v.dot(across).mul(ax).pow2().add(v.dot(along).mul(ay).pow2()).div(cosine.pow2())).sqrt()));
  const fresnel = mix(u.spectralTint, vec3(1), half.dot(view).max(0).oneMinus().pow(5));
  return fresnel.mul(distribution, smith(light, nl), smith(view, nv))
    .div(nv.mul(4)).mul(field.a, u.sheen, u.neutralGain,
      normal.dot(light).smoothstep(0, .04), normal.dot(view).smoothstep(0, .04));
}
