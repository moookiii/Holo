import { MeshPhysicalNodeMaterial, PhysicalLightingModel, type DataArrayTexture, type Texture, type Node, type NodeBuilder } from 'three/webgpu';
import type { LightingModelDirectInput, LightingModelDirectRectAreaInput } from 'three/src/nodes/core/LightingModel.js';
import type { LightingContext } from 'three/src/nodes/lighting/LightingContextNode.js';
import { exp, float, instanceIndex, ivec2, mix, normalMap, normalView, normalViewGeometry, positionView, positionViewDirection, tangentView, texture, textureLoad, uv, varying, vec2, vec3 } from 'three/tsl';
import { spectrum } from '../materials/layers/DiffractionLayer';
import { microdiamondGlints } from '../materials/layers/GlintLayer';
import { gratingDirection, radialStructure } from '../materials/layers/PatternLayer';
import { inspection } from '../lighting/inspection';


interface Region { mask: Node<'float'>; field: Node<'vec4'>; detail: Node<'vec4'>; parameters: Node<'vec4'>[]; ink: Node<'vec3'>; glint: Node<'vec4'>; glintSurface: Node<'vec4'>; sparkle: Node<'float'>; }

/** Uses the viewer's wavelength response and grating momentum under actual
 * incident light. Foil energy enters directSpecular, never the printed color. */
class GalleryLightingModel extends PhysicalLightingModel {
  constructor(private regions: Region[]) { super(true, false, true, false); }
  private backing() {
    return this.regions.reduce<Node<'float'>>((weight, r) => weight.sub(r.mask.mul(r.parameters[5].y.oneMinus())), float(1)).max(.09);
  }
  override direct(data: LightingModelDirectInput, builder: NodeBuilder) {
    super.direct({ ...data, lightColor: (data.lightColor as Node<'vec3'>).mul(this.backing()) }, builder);
    this.diffract(data);
  }
  override directRectArea(data: LightingModelDirectRectAreaInput, builder: NodeBuilder) {
    super.directRectArea({ ...data, lightColor: (data.lightColor as Node<'vec3'>).mul(this.backing()) }, builder);
    const width = data.halfWidth as Node<'vec3'>, height = data.halfHeight as Node<'vec3'>;
    const center = (data.lightPosition as Node<'vec3'>).sub(positionView);
    const distance = center.length().max(.001), direction = center.div(distance);
    const solidAngle = width.cross(height).normalize().dot(direction).max(0).mul(width.length(), height.length(), 4).div(distance.pow2());
    this.diffract({ lightDirection: direction, lightColor: (data.lightColor as Node<'vec3'>).mul(solidAngle), reflectedLight: data.reflectedLight },
      [width.sub(direction.mul(width.dot(direction))).div(distance), height.sub(direction.mul(height.dot(direction))).div(distance)]);
  }
  private diffract(data: Pick<LightingModelDirectInput, 'lightDirection' | 'lightColor' | 'reflectedLight'>, footprint?: [Node<'vec3'>, Node<'vec3'>]) {
    for (const r of this.regions) {
      const [diffraction, axis, structure, , surface, behavior] = r.parameters;
      const light = mix(data.lightDirection as Node<'vec3'>, inspection.sweepDirection, inspection.holoSweep).normalize();
      const geometric = normalViewGeometry as unknown as Node<'vec3'>;
      const bitangent = geometric.cross(tangentView).normalize();
      const radial = radialStructure(float(95), axis.x);
      const direction = mix(radial.direction, gratingDirection(r.field.rg, axis.x), behavior.w).normalize();
      const sheetAxis = tangentView.mul(direction.x).add(bitangent.mul(direction.y)).normalize();
      const authoredNormal = normalView as unknown as Node<'vec3'>;
      const slope = r.detail.rg.sub(.5).mul(structure.y);
      const facet = geometric.add(tangentView.mul(slope.x)).add(bitangent.mul(slope.y)).normalize();
      const n = mix(authoredNormal, facet, axis.w).normalize();
      const projected = sheetAxis.sub(n.mul(sheetAxis.dot(n))).normalize();
      const grating = mix(sheetAxis, projected, structure.w.max(axis.w)).normalize();
      const groove = n.cross(grating).normalize(), momentum = light.add(positionViewDirection);
      const spacing = mix(radial.phase.mul(.09).add(.96), r.field.b.mul(1.5).add(.5), behavior.w);
      const variance = (a: Node<'vec3'>) => footprint ? footprint[0].dot(a).pow2().add(footprint[1].dot(a).pow2()).div(3) : float(0);
      const energy = mix(float(1), r.detail.a.mul(.85).add(.18), structure.x).mul(r.field.a);
      const spectralLobe = (across: Node<'vec3'>, along: Node<'vec3'>) => {
        const width = axis.y.pow2().add(variance(along)).sqrt();
        const aperture = exp(momentum.dot(along).div(width).pow2().mul(-.5)).mul(axis.y.div(width));
        return spectrum(momentum.dot(across).abs().mul(diffraction.x, spacing), diffraction.y, diffraction.w,
          variance(across).mul(diffraction.x.mul(spacing).pow2())).mul(aperture);
      };
      const spectral = spectralLobe(grating, groove).mul(axis.z.oneMinus()).add(spectralLobe(groove, grating).mul(axis.z)).mul(diffraction.z, energy);
      const half = momentum.normalize();
      const silver = n.dot(half).max(0).pow(85).mul(r.field.a, .25, behavior.w, behavior.z);
      const sheen = n.dot(half).max(0).pow(24).mul(surface.y, r.field.a);
      const incident = n.dot(light).max(0), visible = n.dot(positionViewDirection).max(0).sqrt();
      const ink = mix(vec3(1), r.ink, surface.z);
      const halfVariance = footprint ? footprint[0].dot(footprint[0]).add(footprint[1].dot(footprint[1])).div(24) : float(0);
      const broadening = halfVariance.mul(r.glint.z).add(1);
      const sparkle = microdiamondGlints(light, { density: r.glint.x, scale: r.glint.y.max(1), sharpness: r.glint.z.div(broadening),
        strength: r.glint.w.div(broadening), spread: r.glintSurface.x, aspect: r.glintSurface.y.max(.001) }, r.glintSurface.z).mul(r.sparkle, r.field.a);
      (data.reflectedLight.directSpecular as Node<'vec3'>).addAssign(spectral.add(silver).add(sparkle).add(vec3(1, .985, .96).mul(sheen))
        .mul(incident, visible, ink, r.mask, data.lightColor as Node<'vec3'>));
    }
  }
  override indirectSpecular(builder: NodeBuilder) {
    super.indirectSpecular(builder);
    const context = builder.context as LightingContext;
    (context.reflectedLight.indirectSpecular as Node<'vec3'>).mulAssign(this.backing());
    for (const r of this.regions) {
      const backing = mix(float(1), mix(float(.18), float(1), r.field.a), r.parameters[5].w);
      (context.reflectedLight.indirectSpecular as Node<'vec3'>).addAssign((context.radiance as Node<'vec3'>)
        .mul(r.mask, r.parameters[4].x, backing, mix(vec3(1), r.ink, r.parameters[4].z)));
    }
  }
  override finish(builder: NodeBuilder) {
    super.finish(builder);
    const context = builder.context as LightingContext & { outgoingLight: Node<'vec3'> };
    const diffuse = (context.reflectedLight.directDiffuse as Node<'vec3'>).add(context.reflectedLight.indirectDiffuse as Node<'vec3'>);
    context.outgoingLight.assign(mix(diffuse, context.outgoingLight, inspection.polarizer));
  }
}

export class GalleryMaterial extends MeshPhysicalNodeMaterial {
  private regions: Region[];
  constructor(arrays: DataArrayTexture[], parameterTexture: Texture) {
    super({ clearcoat: .2, clearcoatRoughness: .34, roughness: .48, metalness: .015, envMapIntensity: .65, alphaTest: .5 });
    this.name = 'Gallery shared optical material';
    const layer = varying(instanceIndex), coord = vec2(uv().x, uv().y.oneMinus());
    const image = (index: number) => texture(arrays[index], coord).depth(layer);
    const param = (column: number) => textureLoad(parameterTexture, ivec2(column, layer.toInt()));
    const artwork = image(0), print = artwork.rgb, masks = image(1), normal = image(2), metal = artwork.a;
    const weights = [masks.r, masks.g, masks.b];
    this.regions = weights.map((mask, index) => ({ mask, field: image(3 + index), detail: image(6 + index),
      glint: param(28 + index * 2), glintSurface: param(29 + index * 2), sparkle: masks.a,
      parameters: Array.from({ length: 8 }, (_, c) => param(index * 8 + c)), ink: print.max(0).pow(param(index * 8 + 4).w.mul(.5)).mul(.94).add(.06) }));
    const blend = (initial: Node<'float'>, index: number, component: 'x' | 'y' | 'z' | 'w') => this.regions.reduce<Node<'float'>>((value, r) => mix(value, r.parameters[index][component], r.mask), initial);
    const substrate = param(24), background = param(25), ink = param(26), card = param(27);
    const base = mix(mix(print, substrate.rgb, masks.r.mul(substrate.a)), print.add(substrate.rgb.sub(background.rgb).mul(masks.r, substrate.a)).max(0), background.a);
    const darkening = this.regions.reduce<Node<'float'>>((value, r) => value.add(r.mask.mul(r.parameters[5].x)), float(0));
    this.colorNode = mix(base, ink.rgb, metal.mul(ink.a)).mul(darkening.mul(.94).oneMinus()).max(0).pow(blend(float(1), 4, 'w'));
    this.normalNode = normalMap(normal.rgb);
    this.metalnessNode = blend(float(.015), 3, 'x').max(metal.mul(card.x));
    const variance = this.regions.reduce<Node<'float'>>((value, r) => value.add(r.detail.rg.fwidth().length().mul(r.parameters[6].x, r.mask)), float(0)).min(.16);
    this.roughnessNode = normal.a.add(variance).clamp(.045, 1);
    this.clearcoatNode = blend(this.regions[0].parameters[3].z, 3, 'z');
    this.clearcoatRoughnessNode = blend(this.regions[0].parameters[3].w, 3, 'w');
    this.iridescenceNode = blend(float(0), 6, 'z');
    this.iridescenceIORNode = blend(float(1.5), 6, 'w');
    this.iridescenceThicknessNode = this.regions.reduce<Node<'float'>>((v, r) => mix(v, mix(r.parameters[7].x, r.parameters[7].y, r.detail.b), r.mask), float(300));
    this.colorNode = mix(this.colorNode, vec3(.58, .61, .59), blend(float(0), 7, 'z'));
    const edge = uv().sub(.5).abs().sub(vec2(.47, .479)).max(0).length();
    this.opacityNode = edge.lessThan(.021).select(1, 0);
  }
  override setupLightingModel() { return new GalleryLightingModel(this.regions); }
}
