import { MeshPhysicalNodeMaterial, Vector2, Vector4, type Texture, type Node } from 'three/webgpu';
import { texture, uniform, uv, vec2, vec3, mix, float, normalViewGeometry } from 'three/tsl';
import { DEFAULT_FOIL_LAYOUT, type CardDefinition } from '../card/CardDefinition';
import type { HolographicProfile } from './HolographicProfile';
import { StockSurfaceLayer } from './layers/StockSurfaceLayer';
import { reliefNormal } from './layers/ReliefLayer';

/** Printed stock and laminate only. No foil masks, fields or optical graph.
 * All ordinary fronts use the same graph; stock grain/layout vary by uniforms. */
export class PrintFrontMaterial extends MeshPhysicalNodeMaterial {
  readonly printTextureNode;
  constructor(art: Texture, definition: CardDefinition, profile: HolographicProfile, normal?: Texture, roughness?: Texture, height?: Texture) {
    super({ roughness: profile.surface.roughness, metalness: .015,
      clearcoat: profile.surface.laminate, clearcoatRoughness: profile.surface.laminateRoughness,
      envMapIntensity: .65 });
    this.name = 'Printed card front';
    this.printTextureNode = texture(art);
    this.colorNode = this.printTextureNode.rgb;
    if (normal) { this.normalMap = normal; this.normalScale.setScalar(definition.mapSettings?.normalScale ?? 1); }
    if (height && !normal) this.normalNode = reliefNormal(texture(height).r, float((definition.mapSettings?.embossStrength ?? .25) * .008));
    if (roughness) this.roughnessNode = definition.mapSettings?.roughnessMode === 'offset'
      ? texture(roughness).r.sub(128 / 255).mul(.35).add(profile.surface.roughness).clamp(.045, 1) : texture(roughness).r.clamp(.045, 1);
    const layout = definition.layout ?? DEFAULT_FOIL_LAYOUT;
    const rect = uniform(new Vector4(...layout.artwork));
    const p = vec2(uv().x, uv().y.oneMinus());
    const outsideArt = p.x.sub(rect.x).min(rect.z.sub(p.x)).min(p.y.sub(rect.y)).min(rect.w.sub(p.y)).smoothstep(0, .001).oneMinus();
    const stock = new StockSurfaceLayer(definition.seed, uniform(new Vector2((definition.seed % 97) / 7, (definition.seed % 71) / 11)));
    stock.strength.value = definition.franchise === 'Yu-Gi-Oh!' ? 1 : 0;
    const paper = outsideArt.mul(stock.strength);
    const coat = uniform(profile.surface.laminate), coatRoughness = uniform(profile.surface.laminateRoughness);
    this.clearcoatNode = coat.max(paper.mul(.42));
    this.clearcoatRoughnessNode = mix(coatRoughness, .24, paper).add(stock.roughness.mul(.7)).pow2().add(stock.variance).sqrt().clamp(.14, .65);
    this.clearcoatNormalNode = stock.normal(normalViewGeometry as unknown as Node<'vec3'>, .7);
    if (definition.frontBorderColor) {
      const frame = uniform(new Vector4(...layout.innerFrame));
      const border = p.x.sub(frame.x).min(frame.z.sub(p.x)).min(p.y.sub(frame.y)).min(frame.w.sub(p.y)).smoothstep(0, .001).oneMinus();
      const variation = this.printTextureNode.rgb.dot(vec3(.2126, .7152, .0722)).div(.01444).sub(1).mul(.28).add(1).clamp(.84, 1.16);
      this.colorNode = mix(this.colorNode, vec3(...definition.frontBorderColor).mul(variation), border);
    }
  }
}
