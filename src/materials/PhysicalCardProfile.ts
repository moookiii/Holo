import type { CardDefinition, Franchise } from '../card/CardDefinition';

export interface PhysicalCardProfile {
  id: string;
  grainStrength: number;
  grainScale: number;
  fineGrainScale: number;
  microreliefDepth: number;
  roughness: number;
  roughnessVariance: number;
  coatingStrength: number;
  coatingRoughness: number;
  microNormalStrength: number;
  /** Preserve the established artwork-window coating on legacy stock. */
  legacyCoating: boolean;
  recessedName: boolean;
  back: { clearcoat: number; clearcoatRoughness: number };
  edge: { color: [number, number, number]; roughness: number; fiberScale: number; fiberStrength: number; layerVariation: number; coreColor: [number, number, number]; coreWidth: number; reliefDepth: number };
}

const legacy: PhysicalCardProfile = {
  id: 'yugioh-current', grainStrength: 1, grainScale: 52, fineGrainScale: 125,
  microreliefDepth: .0024, roughness: .48, roughnessVariance: .12,
  coatingStrength: .42, coatingRoughness: .24, microNormalStrength: .7,
  legacyCoating: true, recessedName: true,
  back: { clearcoat: .18, clearcoatRoughness: .38 },
  edge: { color: [.39, .37, .32], roughness: .9, fiberScale: 1800, fiberStrength: .035, layerVariation: .028, coreColor: [.15, .16, .17], coreWidth: .16, reliefDepth: .00016 },
};

/** Rendering estimates, not measured factory recipes. No speculative era split. */
export const physicalCardProfiles = {
  'yugioh-current': legacy,
  pokemon: { ...legacy, id: 'pokemon', legacyCoating: false, recessedName: false,
    grainStrength: .9, grainScale: 44, fineGrainScale: 115, microreliefDepth: .0018,
    roughness: .49, roughnessVariance: .045, coatingStrength: .34, coatingRoughness: .31, microNormalStrength: 1.1,
    back: { clearcoat: .3, clearcoatRoughness: .34 },
    edge: { ...legacy.edge, color: [.54, .52, .46], fiberStrength: .023, layerVariation: .035 },
  },
  mtg: { ...legacy, id: 'mtg', legacyCoating: false, recessedName: false,
    grainStrength: .45, grainScale: 85, fineGrainScale: 190, microreliefDepth: .00022,
    roughness: .59, roughnessVariance: .014, coatingStrength: .13, coatingRoughness: .48, microNormalStrength: .5,
    back: { clearcoat: .13, clearcoatRoughness: .48 },
    edge: { ...legacy.edge, color: [.53, .52, .46], fiberStrength: .019, layerVariation: .03, coreColor: [.12, .16, .20] },
  },
  'generic-print': { ...legacy, id: 'generic-print', grainStrength: 0, recessedName: false,
    back: { clearcoat: .34, clearcoatRoughness: .42 } },
} satisfies Record<string, PhysicalCardProfile>;

export type PhysicalCardProfileId = keyof typeof physicalCardProfiles;
const defaults: Record<Franchise, PhysicalCardProfileId> = {
  Original: 'generic-print', 'Yu-Gi-Oh!': 'yugioh-current', 'Pokémon': 'pokemon', 'Magic: The Gathering': 'mtg',
};

export function resolvePhysicalCardProfile(definition: Pick<CardDefinition, 'franchise' | 'physicalProfile' | 'stockSurface' | 'construction'>): PhysicalCardProfile {
  const base = physicalCardProfiles[definition.construction ? 'generic-print' : definition.physicalProfile ?? defaults[definition.franchise]];
  return { ...base, grainStrength: definition.construction ? 0 : definition.stockSurface?.strength ?? base.grainStrength,
    microreliefDepth: definition.stockSurface?.depth ?? base.microreliefDepth };
}
