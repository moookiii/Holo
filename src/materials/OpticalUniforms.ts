import { uniform } from 'three/tsl';
import type { FoilLayer } from './HolographicProfile';

export class OpticalUniforms {
  enabled = uniform(1);
  spectralGain = uniform(1); sparkleGain = uniform(1); neutralGain = uniform(1);
  period = uniform(1.35); bandwidth = uniform(0.043); strength = uniform(1.1);
  secondary = uniform(0.2); angle = uniform(0); crossWidth = uniform(0.32);
  crossing = uniform(0); facetCoupling = uniform(0);
  gridStrength = uniform(0); gridScale = uniform(6.4); gridTravel = uniform(14); gridWidth = uniform(.55);
  crossedFacets = uniform(0);
  engraving = uniform(0.64); scale = uniform(95); relief = uniform(0.24);
  density = uniform(0.22); glintScale = uniform(310); sharpness = uniform(230);
  glintStrength = uniform(13); spread = uniform(0.56);
  orderedGlints = uniform(0); patternRelief = uniform(0); normalVariance = uniform(0);
  metalness = uniform(0.68); roughness = uniform(0.29);
  patternRoughness = uniform(0);
  laminate = uniform(0.72); laminateRoughness = uniform(0.2);
  fieldBlend = uniform(0); facetTilt = uniform(0); anisotropy = uniform(0); aspect = uniform(6.3 / 8.8);
  patternedSilver = uniform(1);
  reflectionCoupling = uniform(1);
  foilReflectance = uniform(0);
  substrateDarkening = uniform(0);
  varnishRelief = uniform(0);
  frameVarnish = uniform(0);
  sheen = uniform(0);
  inkTransmission = uniform(0);
  imageHologram = uniform(0); imageDepth = uniform(.18); imageContrast = uniform(1.5); imageWidth = uniform(.22); cardHeight = uniform(8.8);
  iridescence = uniform(0); filmIOR = uniform(1.5); filmMin = uniform(200); filmMax = uniform(600); pearlBody = uniform(0);
  apply(p: FoilLayer | undefined) {
    this.enabled.value = p && p.enabled !== false ? 1 : 0;
    if (!p) return;
    this.period.value = p.diffraction.period; this.bandwidth.value = p.diffraction.bandwidth;
    this.strength.value = p.diffraction.strength; this.secondary.value = p.diffraction.secondaryOrder;
    this.angle.value = p.diffraction.direction; this.crossWidth.value = p.diffraction.crossWidth;
    this.crossing.value = p.diffraction.crossing ?? 0;
    this.facetCoupling.value = p.diffraction.facetCoupling ?? 0;
    this.engraving.value = p.structure.engraving; this.scale.value = p.structure.scale; this.relief.value = p.structure.relief;
    this.density.value = p.glints.density; this.glintScale.value = p.glints.scale;
    this.sharpness.value = p.glints.sharpness; this.glintStrength.value = p.glints.strength; this.spread.value = p.glints.spread;
    this.orderedGlints.value = p.glints.ordered ? 1 : 0;
    this.patternRelief.value = p.structure.patternRelief ?? 0;
    this.normalVariance.value = p.structure.normalVariance ?? 0;
    this.gridStrength.value = p.structure.gridStrength ?? 0; this.gridScale.value = p.structure.gridScale ?? 6.4;
    this.gridTravel.value = p.structure.gridTravel ?? 14; this.gridWidth.value = p.structure.gridWidth ?? .55;
    this.crossedFacets.value = p.structure.field === 'starlight' ? 1 : 0;
    this.metalness.value = p.surface.metalness; this.roughness.value = p.surface.roughness;
    this.patternRoughness.value = p.surface.patternRoughness ?? 0;
    this.laminate.value = p.surface.laminate; this.laminateRoughness.value = p.surface.laminateRoughness;
    this.fieldBlend.value = p.structure.field === 'radial' ? 0 : 1;
    this.patternedSilver.value = ['plain', 'satin', 'e-reader', 'sheen', 'water-web', 'mirage'].includes(p.structure.field) ? 0 : 1;
    this.facetTilt.value = p.structure.facetTilt ?? 0;
    this.reflectionCoupling.value = p.structure.reflectionCoupling ?? 1;
    this.anisotropy.value = p.surface.anisotropy ?? 0;
    this.foilReflectance.value = p.surface.foilReflectance ?? 0;
    this.sheen.value = p.surface.sheen ?? 0;
    this.inkTransmission.value = p.surface.inkTransmission ?? 0;
    this.substrateDarkening.value = p.surface.substrateDarkening ?? 0;
    this.varnishRelief.value = p.surface.varnishRelief ?? 0;
    this.frameVarnish.value = p.surface.frameVarnish ?? 0;
    this.imageHologram.value = p.surface.imageHologram ?? 0; this.imageDepth.value = p.surface.imageDepth ?? .18;
    this.imageContrast.value = p.surface.imageContrast ?? 1.5; this.imageWidth.value = p.surface.imageWidth ?? .22;
    this.iridescence.value = p.surface.iridescence ?? 0; this.filmIOR.value = p.surface.filmIOR ?? 1.5;
    this.filmMin.value = p.surface.filmMin ?? 200; this.filmMax.value = p.surface.filmMax ?? 600;
    this.pearlBody.value = p.surface.pearlBody ?? 0;
    this.spectralGain.value = this.sparkleGain.value = this.neutralGain.value = 1;
    for (const mechanism of p.disabledMechanisms ?? []) {
      if (mechanism === 'diffraction') this.strength.value = 0;
      if (mechanism === 'sparkle') this.glintStrength.value = 0;
      if (mechanism === 'relief') this.relief.value = this.patternRelief.value = this.facetTilt.value = 0;
      if (mechanism === 'varnish') this.varnishRelief.value = this.frameVarnish.value = 0;
      if (mechanism === 'laminate') this.laminate.value = 0;
      if (mechanism === 'reflection') { this.neutralGain.value = 0; this.foilReflectance.value = this.sheen.value = 0; }
      if (mechanism === 'film') this.iridescence.value = this.pearlBody.value = 0;
      if (mechanism === 'image') this.imageHologram.value = 0;
    }
  }
}
