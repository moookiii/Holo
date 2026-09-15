import type { Node } from 'three/webgpu';
import { uv, vec2, vec3, smoothstep, mix, float, tangentView, bitangentView, normalView, positionViewDirection } from 'three/tsl';
import { stableHash } from './PatternLayer';

export interface GlintUniforms {
  density: Node<'float'>;
  scale: Node<'float'>;
  sharpness: Node<'float'>;
  strength: Node<'float'>;
  spread: Node<'float'>;
  aspect?: Node<'float'>;
  ordered?: Node<'float'>;
}

export function glints(lightDirection: Node<'vec3'>, settings: GlintUniforms, seed: number) {
  const ordered = settings.ordered ?? float(0);
  const point = uv().mul(vec2(settings.aspect ?? float(.716), 1));
  const lattice = mix(point, vec2(point.x.add(point.y), point.y.sub(point.x)), ordered).mul(settings.scale);
  const cell = lattice.floor();
  const r1 = stableHash(cell, seed), r2 = stableHash(cell, seed + 17.3), r3 = stableHash(cell, seed + 76.1);
  const center = mix(vec2(mix(float(.25), float(.75), r1), mix(float(.25), float(.75), r2)), vec2(.5), ordered);
  const local = lattice.fract().sub(center);
  const radius = mix(mix(float(.055), float(.19), r3.pow(4)), float(.11), ordered);
  const footprint = lattice.fwidth().length().mul(0.5).max(0.025);
  const width = footprint.max(radius);
  const spot = smoothstep(width.mul(0.28), width, local.length()).oneMinus();
  // A subpixel facet converges toward its integrated energy, not a random on/off pixel.
  const integratedArea = radius.div(width).pow2();
  const occupied = mix(smoothstep(settings.density, settings.density.add(0.008), r3).oneMinus(), float(1), ordered);
  const normal = normalView.add(tangentView.mul(r1.sub(0.5).mul(settings.spread.mul(2))))
    .add((bitangentView as unknown as Node<'vec3'>).mul(r2.sub(0.5).mul(settings.spread.mul(2)))).normalize();
  const half = lightDirection.add(positionViewDirection).normalize();
  const angular = normal.dot(half).max(0).pow(settings.sharpness);
  return vec3(1, 0.97, 0.91).mul(spot, integratedArea, occupied, angular, settings.strength);
}
