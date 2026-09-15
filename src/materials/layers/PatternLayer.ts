import type { Node } from 'three/webgpu';
import { uv, vec2, float, atan, sin, cos, smoothstep, mix, fract } from 'three/tsl';

/** Fixed manufactured structure. This graph intentionally has no time or screen-coordinate input. */
export function gratingDirection(encoded: Node<'vec2'>, rotation: Node<'float'>) {
  const axis = encoded.mul(2).sub(1);
  const angle = atan(axis.y, axis.x).mul(.5).add(rotation);
  return vec2(cos(angle), sin(angle));
}

export function radialStructure(scale: Node<'float'>, angleOffset: Node<'float'>, aspect: Node<'float'> = float(.716)) {
  const p = uv().sub(vec2(0.5, 0.50)).mul(vec2(aspect, 1));
  const radius = p.length().max(0.001);
  const theta = atan(p.y, p.x);
  // Periodic variation closes across atan's -PI/+PI boundary. A hashed sector
  // jumped at that boundary and made a visible crease through the radial fan.
  const sectorPhase = sin(theta.mul(3).add(43.7)).mul(.25).add(cos(theta.mul(5).sub(.8)).mul(.25)).add(.5);
  const angle = theta.add(angleOffset).add(sin(radius.mul(28)).mul(0.16)).add(sectorPhase.sub(0.5).mul(0.19));
  const turns = scale.round().max(1);
  const phase = theta.mul(turns).add(radius.mul(210));
  // Differentiate the polar coordinates analytically: fwidth(atan) falsely
  // reports a full turn across its branch cut, erasing one row of engraving.
  const gradient = vec2(p.y.negate(), p.x).div(radius.pow2()).mul(turns).add(p.div(radius).mul(210));
  const footprint = gradient.dot(p.dFdx()).abs().add(gradient.dot(p.dFdy()).abs());
  const resolved = smoothstep(0.7, 3.2, footprint).oneMinus();
  const groove = smoothstep(0.32, 0.82, cos(phase));
  const engraving = mix(float(0.36), groove, resolved);
  return { direction: vec2(cos(angle), sin(angle)), engraving, radius, phase: sectorPhase, resolved };
}

export function stableHash(cell: Node<'vec2'>, seed: number) {
  return fract(sin(cell.dot(vec2(127.1, 311.7)).add(seed)).mul(43758.5453));
}
