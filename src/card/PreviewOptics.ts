import { resolvePhysicalCardProfile } from '../materials/PhysicalCardProfile';
import type { CardDefinition } from './CardDefinition';
import { DEFAULT_FOIL_LAYOUT } from './CardLayout';
import type { HolographicProfile } from '../materials/HolographicProfile';

export const PREVIEW_PARAMETER_COLUMNS = 44;
/** Same per-print optical controls as the viewer, packed for one shared shader.
 * Eight RGBA texels per layer; final rows describe ink/substrate and surface. */
export function previewOptics(card: CardDefinition, profile: HolographicProfile) {
  const parameters = new Float32Array(PREVIEW_PARAMETER_COLUMNS * 4);
  const set = (column: number, values: number[]) => parameters.set(values, column * 4);
  [profile, profile.secondary, profile.stamp].forEach((layer, index) => {
    set(index * 8, [1.25, .05, 0, 0]);
    set(index * 8 + 1, [0, .4, 0, 0]);
    set(index * 8 + 4, [0, 0, 0, 1]);
    set(index * 8 + 5, [0, 1, 0, 1]);
    set(index * 8 + 6, [0, 0, 0, 1.5]);
    if (!layer) return;
    const d = layer.diffraction, s = layer.structure, f = layer.surface;
    if (s.field === 'secret') set(37 + index, [s.scale, s.cutAngle ?? Math.PI / 4, s.cutWidth ?? .26, s.facetTilt ?? 0]);
    const disabled = new Set(layer.disabledMechanisms), enabled = layer.enabled !== false && profile.id !== 'print-only';
    const base = index * 8;
    set(base, [d.period, d.bandwidth, enabled && !disabled.has('diffraction') ? d.strength : 0, d.secondaryOrder]);
    set(base + 1, [d.direction, d.crossWidth, d.crossing ?? 0, d.facetCoupling ?? 0]);
    set(base + 2, [s.engraving, disabled.has('relief') ? 0 : s.facetTilt ?? 0, s.reflectionCoupling ?? 1,
      d.followsAuthoredNormals || [card.maps?.direction, card.maps?.secondaryDirection, card.maps?.stampDirection][index] ? 1 : 0]);
    set(base + 3, [f.metalness, f.roughness, disabled.has('laminate') ? 0 : f.laminate, f.laminateRoughness]);
    set(base + 4, [disabled.has('reflection') ? 0 : f.foilReflectance ?? 0, disabled.has('reflection') ? 0 : f.sheen ?? 0, f.inkTransmission ?? 0, f.inkDensity ?? 1]);
    set(base + 5, [f.substrateDarkening ?? 0, s.field === 'starlight' ? .09 : f.substrateReflection ?? 1,
      ['plain', 'satin', 'e-reader', 'sheen', 'water-web', 'mirage'].includes(s.field) ? 0 : 1, s.field === 'radial' ? 0 : 1]);
    set(base + 6, [s.normalVariance ?? 0, f.patternRoughness ?? 0, disabled.has('film') ? 0 : f.iridescence ?? 0, f.filmIOR ?? 1.5]);
    set(base + 7, [f.filmMin ?? 200, f.filmMax ?? 600, f.pearlBody ?? 0, enabled ? 1 : 0]);
    const g = layer.glints;
    set(28 + index * 2, [g.density, g.scale, g.sharpness, enabled && (g.microdiamond || s.field === 'starlight') && !disabled.has('sparkle') ? g.strength : 0]);
    set(29 + index * 2, [g.spread, card.dimensions.width / card.dimensions.height, card.seed + [0, 8191, 16381][index], s.field === 'starlight' ? s.scale : 0]);
  });
  set(24, [...(card.substrate?.color ?? [.27, .31, .30]), card.substrate ? 1 - card.substrate.printRetention : profile.structure.field === 'secret' ? 0 : .1]);
  set(25, [...(card.substrate?.backgroundColor ?? [0, 0, 0]), card.substrate?.backgroundColor ? 1 : 0]);
  set(26, [...(profile.metallicInk?.color ?? [1, 1, 1]), profile.metallicInk?.color ? 1 : 0]);
  set(27, [profile.metallicInk?.metalness ?? .8, profile.metallicInk?.roughness ?? .28, card.dimensions.width / card.dimensions.height, profile.id === 'print-only' ? 1 : 0]);
  set(34, [card.coverageMode === 'reverse' && !!card.maps?.reverseFoil && !card.maps?.metallic ? 1 : 0,
    profile.structure.field === 'legendary-fireworks' ? 1 : 0, profile.structure.field === 'secret' && !!card.maps?.secondaryFoil ? 1 : 0,
    profile.opticalModel === 'sv151-illustration' ? 1 : profile.opticalModel === 'sv-double-rare' ? 2 : profile.opticalModel === 'sv151-ultra' ? 3 : 0]);
  // Plain Ultra Rare has no secret-cut parameters; retain its ridge response.
  if (profile.opticalModel === 'sv151-ultra') set(37, [0, profile.surface.etchedInkSheen ?? 0, 0, 0]);
  set(35, [...(card.frontBorderColor ?? [0, 0, 0]), card.frontBorderColor ? 1 : 0]);
  set(36, (card.layout ?? DEFAULT_FOIL_LAYOUT).innerFrame);
  const physical = resolvePhysicalCardProfile(card);
  set(40, [physical.grainStrength, physical.microreliefDepth, physical.grainScale, physical.fineGrainScale]);
  set(41, [physical.roughness, physical.roughnessVariance, physical.coatingStrength, physical.coatingRoughness]);
  set(42, [physical.microNormalStrength, card.dimensions.width, card.dimensions.height, physical.legacyCoating ? 1 : 0]);
  set(43, [(card.seed % 97) / 7, (card.seed % 71) / 11, physical.id === 'generic-print' ? 0 : 1, card.mapSettings?.roughnessMode === 'absolute' ? 1 : 0]);
  return parameters;
}
