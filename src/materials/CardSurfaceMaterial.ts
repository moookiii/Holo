import { reliefNormal } from './layers/ReliefLayer';
import { StockSurfaceLayer } from './layers/StockSurfaceLayer';
import type { PhysicalCardProfile } from './PhysicalCardProfile';
import type { Node } from 'three/webgpu';
import { MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, Color, Texture } from 'three/webgpu';
import { texture, mix, vec2, uv, positionLocal, sin, float, uniform, normalViewGeometry, vec3, mx_noise_float } from 'three/tsl';

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
    material.normalNode = stock.normal(normalViewGeometry as unknown as Node<'vec3'>, uniform(physical.microNormalStrength).mul(.65));
    material.clearcoatNormalNode = stock.normal(normalViewGeometry as unknown as Node<'vec3'>, uniform(physical.microNormalStrength));
  }
  return material;
}

export function createEdgeMaterial(metal?: { color?: [number, number, number]; roughness: number; metalness: number; }, physical?: PhysicalCardProfile, thickness = .032, coordinateScale = 1) {
  if (metal) return new MeshStandardNodeMaterial({ color: new Color(...(metal.color ?? [1, .71, .29])), roughness: metal.roughness, metalness: metal.metalness, envMapIntensity: .65 });
  const edge = physical?.edge;
  const material = new MeshStandardNodeMaterial({ roughness: edge?.roughness ?? .9, metalness: 0 });
  const p = positionLocal.mul(uniform(coordinateScale));
  // The adhesive core sits between two paper plies. Footprint filtering retains
  // the average core color when its narrow band becomes smaller than a pixel.
  const z = positionLocal.z.div(uniform(thickness));
  const halfCore = uniform((edge?.coreWidth ?? .16) / 2);
  const footprint = z.fwidth().max(.003);
  const core = z.add(footprint.mul(.5)).min(halfCore).sub(z.sub(footprint.mul(.5)).max(halfCore.negate())).div(footprint).clamp(0, 1);
  const base = uniform(new Color(...(edge?.color ?? [.54, .52, .46])));
  const center = uniform(new Color(...(edge?.coreColor ?? [.15, .16, .17])));
  const grainPoint = vec3(p.x.mul(140), p.y.mul(140), p.z.mul(uniform(edge?.fiberScale ?? 1800)));
  const resolved = grainPoint.fwidth().length().pow2().mul(-.5).exp();
  const fibers = mx_noise_float(grainPoint).mul(uniform(edge?.fiberStrength ?? .023), resolved);
  const layers = sin(p.z.mul(580)).mul(uniform(edge?.layerVariation ?? .03));
  material.colorNode = mix(base, center, core.mul(.8)).add(fibers).add(layers);
  // Relief belongs to the cut edge, independent of front foil and engraving.
  const height = mx_noise_float(grainPoint).mul(uniform(edge?.reliefDepth ?? .00016), resolved);
  material.normalNode = reliefNormal(height, uniform(1));
  return material;
}
