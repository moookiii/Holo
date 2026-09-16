import { DoubleSide, MeshPhysicalNodeMaterial, type Texture } from 'three/webgpu';
import { float, mix, sin, texture, uv, normalMap, vec3 } from 'three/tsl';

/** Printed ink over metalized film. The substrate is exposed at the seals and
 * engraved artwork; the dark ink keeps a dielectric polymer highlight. */
export function createWrapperMaterial(print: Texture, inkMask: Texture) {
  const material = new MeshPhysicalNodeMaterial({ side: DoubleSide, clearcoat: .86,
    clearcoatRoughness: .19, roughness: .31, metalness: .7, envMapIntensity: .8 });
  const ink = texture(inkMask).r;
  const grain = sin(uv().x.mul(3600)).mul(sin(uv().y.mul(640))).mul(.015);
  material.colorNode = texture(print).rgb;
  material.metalnessNode = mix(float(.83), float(.22), ink);
  material.roughnessNode = mix(float(.29), float(.39), ink).add(grain);
  // Film emboss is anchored in manufacturing UVs, never camera or time.
  material.normalNode = normalMap(vec3(sin(uv().x.mul(3100)).mul(.012).add(.5),
    sin(uv().y.mul(1600)).mul(.004).add(.5), 1));
  return material;
}
export function createLiningMaterial() {
  return new MeshPhysicalNodeMaterial({ color: 0x9eabb2, metalness: .87, roughness: .36, side: DoubleSide, clearcoat: .25, clearcoatRoughness: .3 });
}
