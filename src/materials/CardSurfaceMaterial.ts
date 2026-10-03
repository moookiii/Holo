import { StockSurfaceLayer } from './layers/StockSurfaceLayer';
import type { PhysicalCardProfile } from './PhysicalCardProfile';
import type { Node } from 'three/webgpu';
import { MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, Color, Texture } from 'three/webgpu';
import { texture, mix, vec2, uv, positionLocal, sin, float, uniform, normalViewGeometry } from 'three/tsl';

export function createPrintMaterial(art: Texture, coverage: Texture, finish?: { clearcoat: number; clearcoatRoughness: number; }, crop?: [number, number, number, number], physical?: PhysicalCardProfile, seed = 0) {
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
  if (physical && !physical.legacyCoating) {
    const stock = new StockSurfaceLayer(seed, undefined, physical);
    material.clearcoat = physical.back.clearcoat;
    material.clearcoatRoughness = physical.back.clearcoatRoughness;
    material.metalnessNode = mix(float(0), float(.8), metal);
    material.roughnessNode = mix(uniform(physical.roughness).add(stock.roughness), float(.26), metal);
    material.clearcoatRoughnessNode = uniform(physical.back.clearcoatRoughness).add(stock.roughness.mul(.7)).pow2().add(stock.variance).sqrt();
    material.clearcoatNormalNode = stock.normal(normalViewGeometry as unknown as Node<'vec3'>, uniform(physical.microNormalStrength));
  }
  return material;
}

export function createEdgeMaterial(metal?: { color?: [number, number, number]; roughness: number; metalness: number; }, physical?: PhysicalCardProfile) {
  if (metal) return new MeshStandardNodeMaterial({ color: new Color(...(metal.color ?? [1, .71, .29])), roughness: metal.roughness, metalness: metal.metalness, envMapIntensity: .65 });
  const material = new MeshStandardNodeMaterial({ color: new Color('#aea89a'), roughness: physical?.edge.roughness ?? .9, metalness: 0 });
  const edge = physical?.edge;
  const phase = positionLocal.z.mul(uniform(edge?.fiberScale ?? 1800)).add(sin(positionLocal.x.mul(140)).mul(.4));
  const integration = physical && !physical.legacyCoating ? phase.fwidth().pow2().mul(-.5).exp() : float(1);
  const fibers = sin(phase).mul(uniform(edge?.fiberStrength ?? .035), integration);
  material.colorNode = uniform(new Color(...(edge?.color ?? [.39, .37, .32] as [number, number, number]))).add(fibers).add(positionLocal.z.mul(260).sin().mul(uniform(edge?.layerVariation ?? 0)));
  return material;
}
