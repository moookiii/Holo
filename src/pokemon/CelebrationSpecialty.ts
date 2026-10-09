import type { CardDefinition } from '../card/CardDefinition';
import { tcglEtchedFinish } from '../materials/profiles/tcglEtchedFinish.ts';

export interface CelebrationStock {
  /** PNG registered to this card's full UV domain. RG axis, B period, A motif. */
  direction: string;
  /** Exact source/evidence record; synthetic calibration fields are not stock. */
  evidence: string;
  /** Classic's independently authored coverage, never inferred from its front. */
  secondaryFoil?: string;
  /** Classic roughness rebuilt with the same secondary region (0.27 there). */
  roughness?: string;
}

/** Explicit authoring entry point: missing stock cannot silently select random
 * legacy fireworks or expand Classic secondary foil across protected print. */
export function withCelebrationSpecialty(card: CardDefinition, stock: CelebrationStock): CardDefinition {
  if (!stock.evidence.trim() || !stock.direction.endsWith('.png'))
    throw new Error('Anniversary specialty requires a PNG optical field and source evidence.');
  const classic = card.pokemon?.setId === '30th-classic';
  if (!classic && card.pokemon?.rarity !== 'Pikachu Rare')
    throw new Error('Anniversary specialty is limited to Pikachu Rare and Classic Collection.');
  if (classic && (!stock.secondaryFoil?.endsWith('.png') || !stock.roughness?.endsWith('.png') || !card.maps?.normal))
    throw new Error('Classic stock requires separate PNG coverage, matching roughness and its exact TCGL normal.');
  const profileOverrides = classic ? {
    ...tcglEtchedFinish,
    secondaryProfile: 'celebration-classic-stock',
    secondary: { opticalModel: 'celebration-classic' as const,
      glints: { density: 0, strength: 0 }, structure: { field: 'plain' as const,
        engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, normalVariance: 0 } },
  } : undefined;
  return {
    ...card, profile: classic ? card.profile : 'celebration-pikachu-fireworks',
    profileOverrides,
    maps: { ...card.maps, ...(classic ? { secondaryDirection: stock.direction,
      secondaryFoil: stock.secondaryFoil, roughness: stock.roughness } : { direction: stock.direction }) },
    mapSettings: { ...card.mapSettings, normalScale: classic ? 1 : 0,
      embossStrength: 0, roughnessMode: 'absolute' },
    pokemon: card.pokemon ? { ...card.pokemon,
      materialProfile: classic ? card.profile : 'celebration-pikachu-fireworks' } : undefined,
    source: { image: card.source?.image ?? card.front, metadata: card.source?.metadata ?? stock.evidence,
      notes: `${card.source?.notes ?? ''} Optical stock evidence: ${stock.evidence}` },
  };
}
