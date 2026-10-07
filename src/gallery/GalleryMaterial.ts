import { StockSurfaceLayer } from '../materials/layers/StockSurfaceLayer';
import { MeshPhysicalNodeMaterial, PhysicalLightingModel, type DataArrayTexture, type Texture, type Node, type NodeBuilder } from 'three/webgpu';
import type { LightingModelDirectInput, LightingModelDirectRectAreaInput } from 'three/src/nodes/core/LightingModel.js';
import type { LightingContext } from 'three/src/nodes/lighting/LightingContextNode.js';
import { Fn, exp, float, instanceIndex, ivec2, mix, normalMap, normalView, normalViewGeometry, positionView, positionViewDirection, tangentView, texture, textureLoad, uv, varying, vec2, vec3 } from 'three/tsl';
import { secretRareReflection } from '../materials/layers/SecretRareLayer';
import { spectrum } from '../materials/layers/DiffractionLayer';
import { illustrationRareReflection } from '../materials/layers/IllustrationRareLayer';
import { doubleRareReflection } from '../materials/layers/DoubleRareLayer';
import { ultraRareReflection } from '../materials/layers/UltraRareLayer';
import { specialIllustrationReflection } from '../materials/layers/SpecialIllustrationLayer';
import { microdiamondGlints } from '../materials/layers/GlintLayer';
import { gratingDirection, radialStructure } from '../materials/layers/PatternLayer';
import { inspection } from '../lighting/inspection';
import type { GalleryOpticalLayer } from './GalleryBatch';

// Same seven spectral bands and arithmetic, emitted once instead of inlining
// their entire graph again for every light, axis and material region.
const gallerySpectrum = Fn(([path, bandwidth, secondary, variance]: Node<'float'>[]) => spectrum(path, bandwidth, secondary, variance))
  .setLayout({ name: 'gallerySpectrum', type: 'vec3', inputs: [
    { name: 'path', type: 'float' }, { name: 'bandwidth', type: 'float' },
    { name: 'secondary', type: 'float' }, { name: 'variance', type: 'float' },
  ] });

interface Region { secret: Node<'vec4'>; mask: Node<'float'>; field: Node<'vec4'>; detail: Node<'vec4'>; parameters: Node<'vec4'>[]; ink: Node<'vec3'>; glint: Node<'vec4'>; glintSurface: Node<'vec4'>; sparkle: Node<'float'>; }
export interface UltraRareTextures { front: Texture; normal: Texture; roughness: Texture; foil: Texture; protection: Texture; }

/** Uses the viewer's wavelength response and grating momentum under actual
 * incident light. Foil energy enters directSpecular, never the printed color. */
class GalleryLightingModel extends PhysicalLightingModel {
  private frames = new Map<Region, ReturnType<GalleryLightingModel['createFrame']>>();
  constructor(private regions: Region[], private layers: GalleryOpticalLayer[]) { super(true, false, layers.some(layer => layer.iridescence), false); }
  // These are surface properties, independent of incident light. Reuse one
  // node graph per region instead of rebuilding/inlining it for every light.
  private createFrame(r: Region) {
    const [, axis, structure, , , behavior] = r.parameters;
    const geometric = normalViewGeometry as unknown as Node<'vec3'>;
    const bitangent = geometric.cross(tangentView).normalize();
    const radial = radialStructure(float(95), axis.x);
    const direction = mix(radial.direction, gratingDirection(r.field.rg, axis.x), behavior.w).normalize();
    const sheetAxis = tangentView.mul(direction.x).add(bitangent.mul(direction.y)).normalize().toVar();
    const authoredNormal = normalView as unknown as Node<'vec3'>;
    const slope = r.detail.rg.sub(.5).mul(structure.y);
    const facet = geometric.add(tangentView.mul(slope.x)).add(bitangent.mul(slope.y)).normalize();
    const n = mix(authoredNormal, facet, axis.w).normalize().toVar();
    const projected = sheetAxis.sub(n.mul(sheetAxis.dot(n))).normalize();
    const grating = mix(sheetAxis, projected, structure.w.max(axis.w)).normalize().toVar();
    return { n, grating, groove: n.cross(grating).normalize().toVar(),
      spacing: mix(radial.phase.mul(.09).add(.96), r.field.b.mul(1.5).add(.5), behavior.w).toVar() };
  }
  private backing() {
    return this.regions.reduce<Node<'float'>>((weight, r, index) => this.layers[index].enabled
      ? weight.sub(r.mask.mul(r.parameters[5].y.oneMinus())) : weight, float(1)).max(.09);
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
    for (const [index, r] of this.regions.entries()) {
      const layer = this.layers[index];
      if (!layer.enabled) continue;
      const [diffraction, axis, structure, , surface, behavior] = r.parameters;
      const light = mix(data.lightDirection as Node<'vec3'>, inspection.sweepDirection, inspection.holoSweep).normalize();
      const geometric = normalViewGeometry as unknown as Node<'vec3'>;
      const bitangent = geometric.cross(tangentView).normalize();
      if (layer.ultraRare || layer.specialIllustration) {
        const reflect = layer.specialIllustration ? specialIllustrationReflection : ultraRareReflection;
        const reflected = reflect(light, positionViewDirection, tangentView, bitangent,
          geometric, normalView, r.ink.sub(.06).div(.94).max(0), {
            aspect: r.glintSurface.y, period: diffraction.x, bandwidth: diffraction.y, strength: diffraction.z, secondary: diffraction.w,
            angle: axis.x, crossWidth: axis.y, inkTransmission: surface.z, etchedInkSheen: r.secret.y,
          }, footprint);
        (data.reflectedLight.directSpecular as Node<'vec3'>).addAssign(reflected.mul(r.mask, r.field.a, data.lightColor as Node<'vec3'>));
        continue;
      }
      if (layer.illustrationRare || layer.doubleRare) {
        const optics = {
          aspect: r.glintSurface.y, period: diffraction.x, bandwidth: diffraction.y, strength: diffraction.z,
          secondary: diffraction.w, angle: axis.x, crossWidth: axis.y,
        };
        const reflected = layer.doubleRare
          ? doubleRareReflection(light, positionViewDirection, tangentView, bitangent, geometric, optics, r.field, footprint)
          : illustrationRareReflection(light, positionViewDirection, tangentView, bitangent, geometric, optics, footprint);
        (data.reflectedLight.directSpecular as Node<'vec3'>).addAssign(reflected.mul(r.mask, r.field.a,
          mix(vec3(1), r.ink, surface.z), data.lightColor as Node<'vec3'>));
        continue;
      }
      if (layer.secret) {
        const reflected = secretRareReflection(light, positionViewDirection, tangentView, bitangent, geometric, {
          scale: r.secret.x, cutAngle: r.secret.y, cutWidth: r.secret.z, facetTilt: r.secret.w,
          aspect: r.glintSurface.y, period: diffraction.x, bandwidth: diffraction.y, strength: diffraction.z,
          secondary: diffraction.w, angle: axis.x, crossWidth: axis.y, roughness: r.parameters[3].y,
        }, footprint);
        (data.reflectedLight.directSpecular as Node<'vec3'>).addAssign(reflected.mul(r.mask, r.field.a, r.ink, data.lightColor as Node<'vec3'>));
      } else {
      if (!this.frames.has(r)) this.frames.set(r, this.createFrame(r));
      const { n, grating, groove, spacing } = this.frames.get(r)!;
      const momentum = light.add(positionViewDirection).toVar();
      const variance = (a: Node<'vec3'>) => footprint ? footprint[0].dot(a).pow2().add(footprint[1].dot(a).pow2()).div(3) : float(0);
      const energy = mix(float(1), r.detail.a.mul(.85).add(.18), structure.x).mul(r.field.a);
      const spectralLobe = (across: Node<'vec3'>, along: Node<'vec3'>) => {
        const width = axis.y.pow2().add(variance(along)).sqrt();
        const aperture = exp(momentum.dot(along).div(width).pow2().mul(-.5)).mul(axis.y.div(width));
        return gallerySpectrum(momentum.dot(across).abs().mul(diffraction.x, spacing), diffraction.y, diffraction.w,
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
      // Absent foil layers have zeroed glint parameters. Keep pow(0, 0)
      // out of their angular response: NaN survives a later zero mask.
      const sparkle = layer.glints ? microdiamondGlints(light, { density: r.glint.x, scale: r.glint.y.max(1), sharpness: r.glint.z.max(1).div(broadening),
        strength: r.glint.w.div(broadening), spread: r.glintSurface.x, aspect: r.glintSurface.y.max(.001) }, r.glintSurface.z).mul(r.sparkle, r.field.a) : vec3(0);
      const contribution = spectral.add(silver).add(sparkle).add(vec3(1, .985, .96).mul(sheen)).mul(incident, visible, ink);
      (data.reflectedLight.directSpecular as Node<'vec3'>).addAssign(contribution.mul(r.mask, data.lightColor as Node<'vec3'>));
      }
    }
  }
  override indirectSpecular(builder: NodeBuilder) {
    super.indirectSpecular(builder);
    const context = builder.context as LightingContext;
    (context.reflectedLight.indirectSpecular as Node<'vec3'>).mulAssign(this.backing());
    for (const [index, r] of this.regions.entries()) {
      if (!this.layers[index].enabled) continue;
      const backing = mix(float(1), mix(float(.18), float(1), r.field.a), r.parameters[5].w);
      (context.reflectedLight.indirectSpecular as Node<'vec3'>).addAssign((context.radiance as Node<'vec3'>)
        .mul(r.mask, r.parameters[4].x, backing, mix(vec3(1), r.ink, r.parameters[4].z.max(r.glintSurface.w.greaterThan(0).select(1, 0)))));
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
  constructor(arrays: DataArrayTexture[], parameterTexture: Texture, private layers: GalleryOpticalLayer[], doubleRareStars?: Texture, ultraRare?: UltraRareTextures) {
    super({ clearcoat: .2, clearcoatRoughness: .34, roughness: .48, metalness: .015, envMapIntensity: .65, alphaTest: .5 });
    this.name = 'Gallery shared optical material';
    if (layers.some(layer => layer.enabled && layer.doubleRare) && !doubleRareStars)
      throw new Error('Double Rare gallery requires the full-resolution reference star texture');
    const layer = varying(instanceIndex), coord = vec2(uv().x, uv().y.oneMinus());
    const imageValues = arrays.map(array => texture(array, coord).depth(layer).toVar());
    const image = (index: number) => imageValues[index];
    const parameterValues = new Map<number, Node<'vec4'>>();
    const param = (column: number) => {
      if (!parameterValues.has(column)) parameterValues.set(column, textureLoad(parameterTexture, ivec2(column, layer.toInt())).toVar());
      return parameterValues.get(column)!;
    };
    const artwork = image(0), print = ultraRare ? texture(ultraRare.front, uv()).rgb : artwork.rgb;
    const masks = image(1), normal = image(2), preview = param(34);
    const metal = ultraRare ? float(0) : artwork.a.mul(preview.x.oneMinus(), preview.z.oneMinus());
    // Same authoritative coverage; only sampling resolution differs from the
    // generic atlas. These source masks are never authored or modified here.
    const primary = ultraRare ? texture(ultraRare.foil, uv()).r.mul(texture(ultraRare.protection, uv()).r.oneMinus())
      : mix(masks.r, artwork.a, preview.x);
    const weights = [primary, mix(masks.g, artwork.a, preview.z), masks.b].map((mask, index) =>
      layers[index].enabled ? mask.mul(param(index * 8 + 7).w) : float(0));
    this.regions = weights.map((mask, index) => ({ mask, secret: param(37 + index),
      field: layers[index].doubleRare && doubleRareStars ? texture(doubleRareStars, uv()) : image(3 + index), detail: image(6 + index),
      glint: param(28 + index * 2), glintSurface: param(29 + index * 2), sparkle: masks.a,
      parameters: Array.from({ length: 8 }, (_, c) => param(index * 8 + c)), ink: print.max(0).pow(param(index * 8 + 4).w.mul(.5)).mul(.94).add(.06).toVar() }));
    const activeRegions = this.regions.filter((_, index) => layers[index].enabled);
    const blend = (initial: Node<'float'>, index: number, component: 'x' | 'y' | 'z' | 'w') => activeRegions.reduce<Node<'float'>>((value, r) => mix(value, r.parameters[index][component], r.mask), initial);
    const substrate = param(24), background = param(25), ink = param(26), card = param(27);
    // Match the focus renderer's neutral border before removing paper light.
    // Keep the original print available for optical ink transmission.
    const border = param(35), frame = param(36);
    const insideFrame = coord.x.sub(frame.x).min(frame.z.sub(coord.x))
      .min(coord.y.sub(frame.y)).min(frame.w.sub(coord.y)).smoothstep(0, .001);
    const borderVariation = print.dot(vec3(.2126, .7152, .0722)).div(.01444).sub(1).mul(.28).add(1).clamp(.84, 1.16);
    const basePrint = mix(print, border.rgb.mul(borderVariation), insideFrame.oneMinus().mul(border.a));
    const base = mix(mix(basePrint, substrate.rgb, primary.mul(substrate.a)), basePrint.add(substrate.rgb.sub(background.rgb).mul(primary, substrate.a)).max(0), background.a);
    const darkening = activeRegions.reduce<Node<'float'>>((value, r) => value.add(r.mask.mul(r.parameters[5].x)), float(0));
    this.colorNode = mix(base, ink.rgb, metal.mul(ink.a)).mul(darkening.mul(.94).oneMinus()).max(0).pow(blend(float(1), 4, 'w'));
    const cutSlope = image(6).rg.sub(.5).mul(param(2).y, param(2).z, primary, preview.y);
    this.normalNode = ultraRare ? normalMap(texture(ultraRare.normal, uv()).rgb)
      : normalMap(vec3(normal.rg.add(cutSlope.mul(.5)), normal.b));
    this.metalnessNode = blend(float(.015), 3, 'x').max(metal.mul(card.x));
    const variance = activeRegions.reduce<Node<'float'>>((value, r) => value.add(r.detail.rg.fwidth().length().mul(r.parameters[6].x, r.mask)), float(0)).min(.16);
    const patternRoughness = activeRegions.reduce<Node<'float'>>((value, r) => value.add(r.field.a.mul(r.parameters[6].y, r.mask)), float(0));
    this.roughnessNode = (ultraRare ? texture(ultraRare.roughness, uv()).r : normal.a).add(variance).add(patternRoughness).clamp(.045, 1);
    this.clearcoatNode = blend(this.regions[0].parameters[3].z, 3, 'z');
    this.clearcoatRoughnessNode = blend(this.regions[0].parameters[3].w, 3, 'w');
    const grain = param(40), finish = param(41), stockCard = param(42), registration = param(43);
    const stock = new StockSurfaceLayer(0, undefined, undefined, {
      point: uv().sub(.5).mul(stockCard.yz).add(registration.xy), strength: grain.x,
      depth: grain.y, scale: grain.z, fineScale: grain.w, variation: finish.y,
    });
    const foil = weights[0].max(weights[1]).max(weights[2]);
    const paper = foil.max(metal).oneMinus().mul(registration.z);
    this.normalNode = stock.normal(this.normalNode as Node<'vec3'>, paper.mul(stockCard.x, .65));
    this.clearcoatNormalNode = stock.normal(normalViewGeometry as unknown as Node<'vec3'>,
      foil.mul(-.65).add(1).mul(metal.oneMinus(), stockCard.x, registration.z));
    this.metalnessNode = mix(this.metalnessNode as Node<'float'>, float(0), paper.mul(stockCard.w.oneMinus()));
    const paperRoughness = mix(finish.x, normal.a, registration.w).add(stock.roughness).clamp(.045, 1);
    this.roughnessNode = mix(this.roughnessNode as Node<'float'>, paperRoughness, paper);
    this.clearcoatNode = mix(this.clearcoatNode as Node<'float'>, finish.z, paper);
    this.clearcoatRoughnessNode = mix(this.clearcoatRoughnessNode as Node<'float'>,
      finish.w.add(stock.roughness.mul(.7)).pow2().add(stock.variance).sqrt(), paper);
    this.iridescenceNode = layers.some(layer => layer.iridescence) ? blend(float(0), 6, 'z') : float(0);
    this.iridescenceIORNode = blend(float(1.5), 6, 'w');
    this.iridescenceThicknessNode = activeRegions.reduce<Node<'float'>>((v, r) => mix(v, mix(r.parameters[7].x, r.parameters[7].y, r.detail.b), r.mask), float(300));
    this.colorNode = mix(this.colorNode, vec3(.58, .61, .59), blend(float(0), 7, 'z'));

  }
  override setupLightingModel() { return new GalleryLightingModel(this.regions, this.layers); }
}
