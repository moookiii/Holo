import { MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, Color, Texture } from 'three/webgpu';
import { texture, mix, vec2, vec3, uv, positionLocal, sin, float } from 'three/tsl';

export function createPrintMaterial(art: Texture, coverage: Texture, finish?: { clearcoat: number; clearcoatRoughness: number; }, crop?: [number, number, number, number]) {
  // Card backs use a broad satin varnish. A tight clearcoat lobe turns the
  // camera/stack settling motion after extraction into a sequence of hard
  // white flashes, especially beneath the pack's narrow studio emitters.
  const material = new MeshPhysicalNodeMaterial({ clearcoat: finish?.clearcoat ?? 0.34, clearcoatRoughness: finish?.clearcoatRoughness ?? 0.42, roughness: 0.44, metalness: 0.08, envMapIntensity: 0.65 });
  // Register the photographed print to the card without resampling the asset.
  const printUV = crop ? uv().mul(vec2(crop[2] - crop[0], crop[3] - crop[1])).add(vec2(crop[0], 1 - crop[3])) : uv();
  const print = texture(art, printUV);
  const metal = texture(coverage).b;
  material.colorNode = print.rgb;
  material.metalnessNode = mix(float(0.02), float(0.8), metal);
  material.roughnessNode = mix(float(0.48), float(0.26), metal);
  return material;
}

export function createEdgeMaterial() {
  const material = new MeshStandardNodeMaterial({ color: new Color('#aea89a'), roughness: 0.9, metalness: 0 });
  const fibers = sin(positionLocal.z.mul(1800).add(sin(positionLocal.x.mul(140)).mul(0.4))).mul(0.035);
  material.colorNode = vec3(0.39, 0.37, 0.32).add(fibers);
  return material;
}
