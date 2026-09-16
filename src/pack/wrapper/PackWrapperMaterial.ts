import { DoubleSide, MeshPhysicalNodeMaterial, type Texture } from 'three/webgpu';
import { float, mix, sin, texture, uv, normalMap, vec3, fwidth, smoothstep } from 'three/tsl';

/** Printed ink over metalized film. The substrate is exposed at the seals and
 * engraved artwork; the dark ink keeps a dielectric polymer highlight. */
export function createWrapperMaterial(print: Texture, inkMask: Texture) {
  const material = new MeshPhysicalNodeMaterial({ side: DoubleSide, clearcoat: .62,
    clearcoatRoughness: .27, roughness: .36, metalness: .7, envMapIntensity: .7 });
  const ink = texture(inkMask).r;
  const resolution = float(1).sub(smoothstep(.6, 2.8, fwidth(uv().x.mul(2600))));
  const grain = sin(uv().x.mul(2600)).mul(sin(uv().y.mul(640))).mul(.008).mul(resolution);
  material.colorNode = texture(print).rgb;
  material.metalnessNode = mix(float(.76), float(.18), ink);
  material.roughnessNode = mix(float(.4), float(.35), ink).add(grain);
  // Film emboss is anchored in manufacturing UVs, never camera or time.
  material.normalNode = normalMap(vec3(sin(uv().x.mul(2600)).mul(.002).mul(resolution).add(.5),
    sin(uv().y.mul(1600)).mul(.001).mul(resolution).add(.5), 1));
  return material;
}
export function createLiningMaterial() {
  return new MeshPhysicalNodeMaterial({ color: 0x7b858d, metalness: .82, roughness: .46, side: DoubleSide, clearcoat: .18, clearcoatRoughness: .35 });
}
