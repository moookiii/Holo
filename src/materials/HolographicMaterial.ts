import { MeshPhysicalNodeMaterial, PhysicalLightingModel, Texture, DataTexture, Vector3, RGBAFormat, UnsignedByteType, type Node, type NodeBuilder } from 'three/webgpu';
import type { LightingModelDirectInput, LightingModelDirectRectAreaInput } from 'three/src/nodes/core/LightingModel.js';
import type { LightingContext } from 'three/src/nodes/lighting/LightingContextNode.js';
import { texture, uniform, float, vec2, vec3, mix, exp, If, Fn, uv, normalView, normalViewGeometry, positionView, positionViewDirection, tangentView, tangentGeometry, bitangentView, normalMap } from 'three/tsl';
import { masterPrism, type HolographicProfile } from './HolographicProfile';
import { OpticalUniforms } from './OpticalUniforms';
import { spectrum } from './layers/DiffractionLayer';
import { radialStructure, gratingDirection } from './layers/PatternLayer';
import { glints } from './layers/GlintLayer';
import { angularGrid } from './layers/AngularGridLayer';
import { starlightGridReflection } from './layers/StarlightLayer';
import { reliefNormal } from './layers/ReliefLayer';
import { RecessedNameLayer } from './layers/RecessedNameLayer';
import { hologramImage, hologramReconstruction } from './layers/ImageHologramLayer';
import type { PatternTextures } from './patterns/PatternCache';
import { DEFAULT_FOIL_LAYOUT, type CardDefinition } from '../card/CardDefinition';
import type { CardMaterialMaps } from '../assets/CardMapLoader';

interface OpticalRegion {
  coverage: Node<'float'>;
  optics: OpticalUniforms;
  seed: number;
  field: Node<'vec4'>;
  details: Node<'vec4'>;
  pattern: Node<'float'>;
  image?: Node<'vec3'>;
  imageDepth?: Node<'float'>;
}
export interface ProfileFields { primary?: PatternTextures; secondary?: PatternTextures; stamp?: PatternTextures; }

class HolographicLightingModel extends PhysicalLightingModel {
  constructor(private regions: OpticalRegion[], private sparkleCoverage: Node<'float'>) { super(true, false, true, true); }
  override direct(data: LightingModelDirectInput, builder: NodeBuilder) {
    // Substrate and clearcoat are evaluated once, regardless of the number of foil regions.
    super.direct(data, builder);
    this.diffract(data);
  }
  override directRectArea(data: LightingModelDirectRectAreaInput, builder: NodeBuilder) {
    super.directRectArea(data, builder);
    const width = data.halfWidth as Node<'vec3'>, height = data.halfHeight as Node<'vec3'>;
    const center = (data.lightPosition as Node<'vec3'>).sub(positionView);
    const facing = width.cross(height).normalize();
    const distance = center.length().max(.001), direction = center.div(distance);
    const solidAngle = facing.dot(direction).max(0).mul(width.length(), height.length(), 4).div(distance.pow2());
    // Moment-matched angular footprint of a uniform rectangle. Convolving the
    // spectral lobes avoids sparse multi-sample highlights and shader duplication.
    const angularWidth = width.sub(direction.mul(width.dot(direction))).div(distance);
    const angularHeight = height.sub(direction.mul(height.dot(direction))).div(distance);
    this.diffract({ lightDirection: direction, lightColor: (data.lightColor as Node<'vec3'>).mul(solidAngle), reflectedLight: data.reflectedLight }, [angularWidth, angularHeight]);
  }
  private diffract(data: Pick<LightingModelDirectInput, 'lightDirection' | 'lightColor' | 'reflectedLight'>, footprint?: [Node<'vec3'>, Node<'vec3'>]) {
    for (const region of this.regions) If(region.optics.enabled.greaterThan(0), () => {
      const u = region.optics;
      const light = data.lightDirection as Node<'vec3'>;
      const structure = radialStructure(u.scale, u.angle, u.aspect);
      const bitangent = bitangentView as unknown as Node<'vec3'>;
      const rotatedDirection = gratingDirection(region.field.rg, u.angle);
      const direction = mix(structure.direction, rotatedDirection, u.fieldBlend).normalize();
      const grating = tangentView.mul(direction.x).add(bitangent.mul(direction.y)).normalize().toVar();
      const foilNormal = normalView.toVar();
      If(u.facetCoupling.greaterThan(0), () => {
        // A grating pressed into an inclined ribbon lies in that ribbon's plane.
        // Transport its axis onto the manufactured normal before evaluating the
        // optical path. Otherwise facet tilt changes silver but leaves a flat
        // rainbow wash spanning every row. Existing flat-sheet profiles retain
        // their calibrated axis until they are individually re-evaluated.
        const geometryNormal = normalViewGeometry as unknown as Node<'vec3'>;
        const geometryBitangent = geometryNormal.cross(tangentView).mul(tangentGeometry.w).normalize();
        const sheetAxis = tangentView.mul(direction.x).add(geometryBitangent.mul(direction.y)).normalize();
        const slope = region.details.rg.sub(.5).mul(u.facetTilt);
        const facetNormal = geometryNormal.add(tangentView.mul(slope.x)).add(geometryBitangent.mul(slope.y)).normalize();
        const facetAxis = sheetAxis.sub(facetNormal.mul(sheetAxis.dot(facetNormal))).normalize();
        grating.assign(mix(grating, facetAxis, u.facetCoupling).normalize());
        foilNormal.assign(mix(foilNormal, facetNormal, u.facetCoupling).normalize());
      });
      const groove = foilNormal.cross(grating).normalize();
      // Reflection-grating momentum: d * |(L + V) · G| = m λ.
      const momentum = light.add(positionViewDirection);
      const geometryNormal = normalViewGeometry as unknown as Node<'vec3'>;
      const geometryBitangent = geometryNormal.cross(tangentView).mul(tangentGeometry.w).normalize();
      // Keep derivatives in continuous control flow. Building this expression
      // inside an optional TSL branch can leave shared intermediate values
      // undefined in the subsequently evaluated physical-lighting graph.
      const selected = angularGrid(momentum, tangentView, geometryBitangent, geometryNormal, u.aspect, u.gridScale, u.gridTravel, u.gridWidth, u.gridCrisp);
      const gridGain = mix(float(2.4), float(4.8), u.gridCrisp);
      const grid = mix(float(1), selected.mul(gridGain).add(.48), u.gridStrength).toVar();
      const opticalGrid = mix(grid, float(1), u.gridCrisp);
      const spacing = mix(structure.phase.mul(0.09).add(0.96), region.field.b.mul(1.5).add(.5), u.fieldBlend);
      const path = momentum.dot(grating).abs().mul(u.period, spacing);
      const variance = (axis: Node<'vec3'>) => footprint ? footprint[0].dot(axis).pow2().add(footprint[1].dot(axis).pow2()).div(3) : float(0);
      const gratingVariance = variance(grating), grooveVariance = variance(groove);
      const angularWidth = u.crossWidth.pow2().add(grooveVariance).sqrt();
      const transverse = momentum.dot(groove).div(angularWidth);
      const aperture = exp(transverse.pow2().mul(-0.5)).mul(u.crossWidth.div(angularWidth));
      const etched = mix(structure.engraving, region.details.a, u.fieldBlend);
      const patternCoverage = mix(float(1), region.field.a, u.fieldBlend);
      const grooveEnergy = mix(float(1), etched.mul(0.85).add(0.18), u.engraving).mul(patternCoverage, region.pattern, opticalGrid);
      const spectral = spectrum(path, u.bandwidth, u.secondary, gratingVariance.mul(u.period.mul(spacing).pow2())).mul(aperture, grooveEnergy, u.strength, u.crossing.oneMinus()).toVar();
      If(u.imageHologram.greaterThan(0), () => {
        spectral.addAssign(hologramReconstruction(light, region.image!, region.imageDepth!, u, variance(tangentView)));
      });
      If(u.crossing.greaterThan(0), () => {
        const crossPath = momentum.dot(groove).abs().mul(u.period, spacing);
        const crossWidth = u.crossWidth.pow2().add(gratingVariance).sqrt();
        const crossAperture = exp(momentum.dot(grating).div(crossWidth).pow2().mul(-.5)).mul(u.crossWidth.div(crossWidth));
        spectral.addAssign(spectrum(crossPath, u.bandwidth, u.secondary, grooveVariance.mul(u.period.mul(spacing).pow2())).mul(crossAperture, grooveEnergy, u.strength, u.crossing));
      });
      const halfVariance = footprint ? footprint[0].dot(footprint[0]).add(footprint[1].dot(footprint[1])).div(24) : float(0);
      const glintBroadening = halfVariance.mul(u.sharpness).add(1);
      const sparkle = glints(light, { density: u.density, scale: u.glintScale, sharpness: u.sharpness.div(glintBroadening), strength: u.glintStrength.div(glintBroadening), spread: u.spread, aspect: u.aspect, ordered: u.orderedGlints }, region.seed).mul(this.sparkleCoverage, region.pattern);
      const starlightGrid = starlightGridReflection(momentum, tangentView, geometryBitangent, selected, u, region.seed)
        .mul(region.pattern, this.sparkleCoverage);
      // Smooth foil already has the physical metal reflection. The additional
      // neutral lobe belongs to manufactured cuts; applying it to a plain sheet
      // doubled its reflection and washed out the artwork near the key light.
      const silver = foilNormal.dot(momentum.normalize()).max(0).pow(85).mul(patternCoverage, .25, u.fieldBlend, u.patternedSilver, region.pattern, opticalGrid);
      const incident = foilNormal.dot(light).max(0);
      const visible = foilNormal.dot(positionViewDirection).max(0).sqrt();
      // Nacre needs a neutral, broad reflection lobe in addition to its
      // angle-dependent thin-film color. Keep it separate from diffraction so
      // a zero-strength grating (as used by Opal) still has a readable shine.
      const pearlHalf = foilNormal.dot(momentum.normalize()).max(0).pow(24);
      const pearlSheen = pearlHalf.mul(u.sheen, patternCoverage, region.pattern);
      // Reflected specular, before physical clearcoat attenuation and tone mapping.
      const foil = spectral.add(sparkle.mul(opticalGrid)).add(silver).add(starlightGrid.mul(u.gridCrisp));
      (data.reflectedLight.directSpecular as Node<'vec3'>).addAssign(foil.add(vec3(1, .985, .96).mul(pearlSheen)).mul(region.coverage, incident, visible, data.lightColor as Node<'vec3'>));
    });
  }
  override indirectSpecular(builder: NodeBuilder) {
    super.indirectSpecular(builder);
    const context = builder.context as LightingContext;
    const radiance = context.radiance as Node<'vec3'>;
    for (const region of this.regions) {
      // Neutral backing must not disappear merely because the scan pixels are dark.
      const backing = mix(float(1), mix(float(.18), float(1), region.field.a.mul(region.pattern)), region.optics.fieldBlend);
      (context.reflectedLight.indirectSpecular as Node<'vec3'>).addAssign(radiance.mul(region.coverage, region.optics.foilReflectance, backing));
    }
  }
}

export class HolographicMaterial extends MeshPhysicalNodeMaterial {
  readonly nameRecess?: RecessedNameLayer;
  readonly optics = new OpticalUniforms();
  readonly secondaryOptics = new OpticalUniforms();
  readonly stampOptics = new OpticalUniforms();
  readonly printTextureNode;
  readonly coverageTextureNode;
  readonly surfaceTextureNode;
  readonly fieldTextureNode;
  readonly reliefTextureNode;
  readonly secondaryFieldTextureNode;
  readonly secondaryReliefTextureNode;
  readonly stampFieldTextureNode;
  readonly stampReliefTextureNode;
  readonly patternTextureNode;
  readonly normalTextureNode;
  readonly hologramTextureNode;
  readonly surfaceControls = {
    hasExtendedFoil: uniform(0), extendedCoverage: uniform(0),
    hasStamp: uniform(0), hasNormal: uniform(0), normalScale: uniform(1),
    anniversary: uniform(0),
    roughnessAbsolute: uniform(0), roughnessOffset: uniform(0), embossOverride: uniform(0), embossStrength: uniform(.25),
  };
  private inkEnabled = uniform(0);
  private inkTint = uniform(new Vector3(1, 1, 1));
  private inkTintStrength = uniform(0);
  private inkRoughness = uniform(.28);
  private inkMetalness = uniform(.85);
  private neutralField = new DataTexture(new Uint8Array([255, 128, 85, 255]), 1, 1, RGBAFormat, UnsignedByteType);
  private neutralRelief = new DataTexture(new Uint8Array([128, 128, 128, 128]), 1, 1, RGBAFormat, UnsignedByteType);
  private neutralWhite = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat, UnsignedByteType);
  private neutralHologram = new DataTexture(new Uint8Array([128, 0, 128, 0]), 1, 1, RGBAFormat, UnsignedByteType);
  private regions: OpticalRegion[];
  constructor(art: Texture, coverage: Texture, surface: Texture, seed: number, profile = masterPrism, substrate?: CardDefinition['substrate'], private cardMaps?: CardMaterialMaps, frontBorderColor?: CardDefinition['frontBorderColor'], recessedName = false) {
    super({ clearcoat: 0.72, clearcoatRoughness: 0.2, metalness: 0.5, roughness: 0.3, envMapIntensity: 0.65 });
    this.neutralField.needsUpdate = true; this.neutralRelief.needsUpdate = true; this.neutralWhite.needsUpdate = true;
    this.neutralHologram.needsUpdate = true;
    this.hologramTextureNode = texture(cardMaps?.hologram ?? this.neutralHologram);
    this.fieldTextureNode = texture(this.neutralField); this.reliefTextureNode = texture(this.neutralRelief);
    this.secondaryFieldTextureNode = texture(this.neutralField); this.secondaryReliefTextureNode = texture(this.neutralRelief);
    this.stampFieldTextureNode = texture(this.neutralField); this.stampReliefTextureNode = texture(this.neutralRelief);
    this.patternTextureNode = texture(cardMaps?.pattern ?? this.neutralWhite);
    this.normalTextureNode = texture(cardMaps?.normal ?? this.neutralWhite);
    this.printTextureNode = texture(art); this.coverageTextureNode = texture(coverage); this.surfaceTextureNode = texture(surface);
    this.nameRecess = recessedName ? new RecessedNameLayer(this.coverageTextureNode, this.optics.aspect, this.optics.cardHeight) : undefined;
    const controls = this.surfaceControls;
    controls.hasStamp.value = cardMaps?.hasStamp ? 1 : 0; controls.hasNormal.value = cardMaps?.hasNormal ? 1 : 0;
    controls.hasExtendedFoil.value = cardMaps?.hasExtendedFoil ? 1 : 0;
    controls.normalScale.value = cardMaps?.normalScale ?? 1;
    controls.roughnessAbsolute.value = cardMaps?.roughnessMode === 'absolute' ? 1 : 0;
    controls.roughnessOffset.value = cardMaps?.roughnessMode === 'offset' ? 1 : 0;
    controls.embossOverride.value = cardMaps?.embossStrength === undefined ? 0 : 1;
    controls.embossStrength.value = cardMaps?.embossStrength ?? .25;
    this.setProfile(profile);
    const print = this.printTextureNode.rgb, mask = this.coverageTextureNode;
    const layout = cardMaps?.layout ?? DEFAULT_FOIL_LAYOUT, printPoint = vec2(uv().x, uv().y.oneMinus());
    const inside = (rect: [number, number, number, number]) => printPoint.x.sub(rect[0]).min(float(rect[2]).sub(printPoint.x))
      .min(printPoint.y.sub(rect[1])).min(float(rect[3]).sub(printPoint.y)).smoothstep(0, .001);
    // The supplied scan has a neutral charcoal margin outside the printed card.
    // Keep its fine grain, but bring its average tone onto the inner black keyline.
    const outerBorder = inside(layout.innerFrame).oneMinus();
    const borderVariation = print.dot(vec3(.2126, .7152, .0722)).div(.01444).sub(1).mul(.28).add(1).clamp(.84, 1.16);
    const correctedPrint = frontBorderColor
      ? mix(print, vec3(...frontBorderColor).mul(borderVariation), outerBorder)
      : print;
    // Secondary regions take priority where authored masks overlap; energies do not add twice.
    const stampMask = this.surfaceTextureNode.a.mul(controls.hasStamp), stamp = stampMask.mul(this.stampOptics.enabled);
    const extended = this.patternTextureNode.a.mul(controls.hasExtendedFoil, controls.extendedCoverage);
    // Publisher logo geometry is packed into an otherwise unused data channel.
    // It receives its own reflected material beneath the protected printed ink.
    const logoShape = this.hologramTextureNode.a;
    const printTransmission = print.dot(vec3(.2126, .7152, .0722)).smoothstep(.025, .22);
    const watermark = logoShape.mul(controls.anniversary, printTransmission);
    const secondary = mix(mask.g, watermark, controls.anniversary).mul(this.secondaryOptics.enabled, stamp.oneMinus());
    const artCoverage = mask.r.max(extended);
    const primary = mix(artCoverage, this.hologramTextureNode.g, this.optics.imageHologram).mul(this.optics.enabled, secondary.oneMinus(), stamp.oneMinus());
    const metal = mask.b.max(stampMask.mul(this.stampOptics.enabled.oneMinus()));
    this.regions = [
      { coverage: primary, optics: this.optics, seed, field: this.fieldTextureNode, details: this.reliefTextureNode, pattern: this.patternTextureNode.r },
      { coverage: secondary, optics: this.secondaryOptics, seed: seed + 8191, field: this.secondaryFieldTextureNode, details: this.secondaryReliefTextureNode, pattern: this.patternTextureNode.g },
      { coverage: stamp, optics: this.stampOptics, seed: seed + 16381, field: this.stampFieldTextureNode, details: this.stampReliefTextureNode, pattern: this.patternTextureNode.b },
    ];
    for (const region of this.regions) {
      region.image = hologramImage(this.printTextureNode, this.hologramTextureNode, region.optics);
      region.imageDepth = this.hologramTextureNode.b;
    }
    // A nonfoil reference contains paper light beneath antialiased printed ink.
    // Remove that transmitted paper contribution before inserting the metal;
    // a simple gray mix would leave bright fringes around dark lettering.
    const base = substrate?.backgroundColor
      ? correctedPrint.add(vec3(...substrate.color).sub(vec3(...substrate.backgroundColor)).mul(primary, 1 - substrate.printRetention)).max(0)
      : substrate ? mix(correctedPrint, vec3(...substrate.color), primary.mul(1 - substrate.printRetention))
        : mix(correctedPrint, vec3(0.27, 0.31, 0.30), primary.mul(0.1));
    this.colorNode = mix(base, this.inkTint, metal.mul(this.inkTintStrength));
    this.colorNode = mix(this.colorNode, vec3(.42, .44, .43), watermark.mul(.36));
    const absorption = primary.mul(this.optics.substrateDarkening).add(secondary.mul(this.secondaryOptics.substrateDarkening)).add(stamp.mul(this.stampOptics.substrateDarkening));
    this.colorNode = this.colorNode.mul(absorption.mul(.94).oneMinus());
    const imageCoverage = primary.mul(this.optics.imageHologram).add(secondary.mul(this.secondaryOptics.imageHologram)).add(stamp.mul(this.stampOptics.imageHologram));
    this.colorNode = mix(this.colorNode, vec3(.25, .27, .28), imageCoverage.clamp(0, 1));
    if (this.nameRecess) this.colorNode = this.colorNode.mul(this.nameRecess.occlusion);
    this.metalnessNode = mix(mix(mix(float(.015), this.optics.metalness, primary), this.secondaryOptics.metalness, secondary), this.stampOptics.metalness, stamp).max(metal.mul(this.inkMetalness));
    const foilRoughness = mix(mix(mix(float(.48), this.optics.roughness, primary), this.secondaryOptics.roughness, secondary), this.stampOptics.roughness, stamp).sub(metal.mul(.12)).max(.12);
    const normalVariance = this.reliefTextureNode.rg.fwidth().length().mul(this.optics.normalVariance, primary)
      .add(this.secondaryReliefTextureNode.rg.fwidth().length().mul(this.secondaryOptics.normalVariance, secondary))
      .add(this.stampReliefTextureNode.rg.fwidth().length().mul(this.stampOptics.normalVariance, stamp)).min(.16);
    const inkRoughness = mix(foilRoughness, this.inkRoughness, metal.mul(this.inkEnabled));
    this.roughnessNode = mix(inkRoughness, this.surfaceTextureNode.g, controls.roughnessAbsolute)
      .add(this.surfaceTextureNode.g.sub(128 / 255).mul(.35, controls.roughnessOffset)).add(normalVariance)
      .add(this.fieldTextureNode.a.mul(this.optics.patternRoughness, primary))
      .add(this.secondaryFieldTextureNode.a.mul(this.secondaryOptics.patternRoughness, secondary))
      .add(this.stampFieldTextureNode.a.mul(this.stampOptics.patternRoughness, stamp)).clamp(.045, 1);
    this.clearcoatNode = mix(mix(this.optics.laminate, this.secondaryOptics.laminate, secondary), this.stampOptics.laminate, stamp).mul(mask.a);
    this.clearcoatRoughnessNode = mix(mix(this.optics.laminateRoughness, this.secondaryOptics.laminateRoughness, secondary), this.stampOptics.laminateRoughness, stamp);
    const frame = inside(layout.innerFrame).mul(inside(layout.artwork).oneMinus(), primary, this.optics.frameVarnish);
    this.clearcoatNode = (this.clearcoatNode as Node<'float'>).max(frame);
    this.clearcoatRoughnessNode = mix(this.clearcoatRoughnessNode as Node<'float'>, float(.18), frame);
    const heightStrength = mix(this.optics.relief.mul(primary).add(this.secondaryOptics.relief.mul(secondary)).add(this.stampOptics.relief.mul(stamp)), controls.embossStrength, controls.embossOverride);
    const baseNormal = reliefNormal(this.surfaceTextureNode.r, heightStrength.mul(.008));
    const varnishStrength = this.optics.varnishRelief.mul(primary).add(this.secondaryOptics.varnishRelief.mul(secondary)).add(this.stampOptics.varnishRelief.mul(stamp));
    this.clearcoatNormalNode = reliefNormal(this.surfaceTextureNode.r, varnishStrength.mul(.008));
    if (this.nameRecess) this.clearcoatNormalNode = (this.clearcoatNormalNode as Node<'vec3'>).add(this.nameRecess.normal.sub(normalViewGeometry)).normalize();
    const slope = this.reliefTextureNode.rg.sub(.5).mul(this.optics.facetTilt, this.optics.reflectionCoupling, this.optics.fieldBlend, primary)
      .add(this.secondaryReliefTextureNode.rg.sub(.5).mul(this.secondaryOptics.facetTilt, this.secondaryOptics.reflectionCoupling, this.secondaryOptics.fieldBlend, secondary))
      .add(this.stampReliefTextureNode.rg.sub(.5).mul(this.stampOptics.facetTilt, this.stampOptics.reflectionCoupling, this.stampOptics.fieldBlend, stamp));
    this.normalNode = Fn(() => {
      const normal = baseNormal.toVar();
      const geometryNormal = normalViewGeometry as unknown as Node<'vec3'>;
      if (this.nameRecess) normal.addAssign(this.nameRecess.normal.sub(geometryNormal));
      // Resolve the geometric frame before optional normal-map control flow.
      // Otherwise TSL can first initialize NORMAL_tangentView inside that branch
      // and later reuse its uninitialized value for manufactured slopes.
      const geometryTangent = tangentView.toVar();
      const geometryBitangent = geometryNormal.cross(geometryTangent).mul(tangentGeometry.w).normalize().toVar();
      const stamped = reliefNormal(logoShape, controls.anniversary.mul(.00006, printTransmission));
      normal.addAssign(stamped.sub(geometryNormal));
      If(controls.hasNormal.greaterThan(0), () => {
        const mapped = normalMap(this.normalTextureNode.rgb, vec2(controls.normalScale)) as unknown as Node<'vec3'>;
        normal.addAssign(mapped.sub(geometryNormal));
      });
      If(this.optics.patternRelief.greaterThan(0), () => {
        const engraved = reliefNormal(this.reliefTextureNode.b, this.optics.patternRelief.mul(.008, this.optics.fieldBlend, primary));
        normal.addAssign(engraved.sub(geometryNormal));
      });
      If(this.secondaryOptics.patternRelief.greaterThan(0), () => {
        const engraved = reliefNormal(this.secondaryReliefTextureNode.b, this.secondaryOptics.patternRelief.mul(.008, this.secondaryOptics.fieldBlend, secondary));
        normal.addAssign(engraved.sub(geometryNormal));
      });
      If(this.stampOptics.patternRelief.greaterThan(0), () => {
        const engraved = reliefNormal(this.stampReliefTextureNode.b, this.stampOptics.patternRelief.mul(.008, this.stampOptics.fieldBlend, stamp));
        normal.addAssign(engraved.sub(geometryNormal));
      });
      return normal.add(geometryTangent.mul(slope.x)).add(geometryBitangent.mul(slope.y)).normalize();
    })();
    this.anisotropyNode = vec2(this.optics.anisotropy.mul(primary).add(this.secondaryOptics.anisotropy.mul(secondary)).add(this.stampOptics.anisotropy.mul(stamp)), 0);
    // Three's spectral thin-film BRDF gives pearl a different optical mechanism
    // from grating foil. The manufactured height also describes local film thickness.
    const filmWeights = this.regions.map(region => region.coverage.mul(region.optics.iridescence, region.pattern));
    const filmCoverage = filmWeights[0].add(filmWeights[1]).add(filmWeights[2]);
    const filmIOR = this.regions.map((region, i) => region.optics.filmIOR.mul(filmWeights[i]));
    const filmThickness = this.regions.map((region, i) => mix(region.optics.filmMin, region.optics.filmMax, region.details.b).mul(filmWeights[i]));
    this.iridescenceNode = filmCoverage.clamp(0, 1);
    this.iridescenceIORNode = filmIOR[0].add(filmIOR[1]).add(filmIOR[2]).div(filmCoverage.max(.0001)).max(1);
    this.iridescenceThicknessNode = filmThickness[0].add(filmThickness[1]).add(filmThickness[2]).div(filmCoverage.max(.0001));
    const pearl = this.regions.map(region => region.coverage.mul(region.optics.pearlBody));
    // Pale platelet material lies beneath the film; its illumination still goes
    // through the physical diffuse/specular model and independent clear laminate.
    this.colorNode = mix(this.colorNode, vec3(.58, .61, .59), pearl[0].add(pearl[1]).add(pearl[2]).clamp(0, 1));
  }
  setProfile(profile: HolographicProfile, maps: ProfileFields = {}) {
    this.surfaceControls.extendedCoverage.value = profile.extendedCoverage ? 1 : 0;
    this.surfaceControls.anniversary.value = profile.watermark === 'quarter-century' ? 1 : 0;
    this.fieldTextureNode.value = this.cardMaps?.direction ?? maps.primary?.direction ?? this.neutralField;
    this.reliefTextureNode.value = maps.primary?.relief ?? this.neutralRelief;
    this.secondaryFieldTextureNode.value = this.cardMaps?.secondaryDirection ?? maps.secondary?.direction ?? this.neutralField;
    this.secondaryReliefTextureNode.value = maps.secondary?.relief ?? this.neutralRelief;
    this.stampFieldTextureNode.value = this.cardMaps?.stampDirection ?? maps.stamp?.direction ?? this.neutralField;
    this.stampReliefTextureNode.value = maps.stamp?.relief ?? this.neutralRelief;
    this.optics.apply(profile); this.secondaryOptics.apply(profile.secondary); this.stampOptics.apply(profile.stamp);
    if (profile.id === 'print-only') this.optics.enabled.value = 0;
    if (this.cardMaps?.direction) this.optics.fieldBlend.value = 1;
    if (this.cardMaps?.secondaryDirection) this.secondaryOptics.fieldBlend.value = 1;
    if (this.cardMaps?.stampDirection) this.stampOptics.fieldBlend.value = 1;
    this.inkEnabled.value = profile.metallicInk ? 1 : 0;
    this.inkTintStrength.value = profile.metallicInk?.color ? 1 : 0;
    this.inkTint.value.fromArray(profile.metallicInk?.color ?? [1, 1, 1]);
    this.inkRoughness.value = profile.metallicInk?.roughness ?? .28;
    this.inkMetalness.value = profile.metallicInk?.metalness ?? .85;
  }
  setAspect(aspect: number, height = 8.8) {
    for (const optics of [this.optics, this.secondaryOptics, this.stampOptics]) { optics.aspect.value = aspect; optics.cardHeight.value = height; }
  }
  override setupLightingModel() { return new HolographicLightingModel(this.regions, this.surfaceTextureNode.b); }
  override dispose() { this.neutralField.dispose(); this.neutralRelief.dispose(); this.neutralWhite.dispose(); this.neutralHologram.dispose(); super.dispose(); }
}

