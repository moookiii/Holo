import type { CardDefinition } from '../card/CardDefinition.ts';
import { DIMENSIONS } from '../card/CardDefinition.ts';
import type { LobRarity, YugiohCard } from './types.ts';
import registration from './sets/lob-registration.json' with { type: 'json' };

export function profileFor(rarity: LobRarity) {
  // The common/rare use zero primary coverage with the existing stamp-capable
  // material. print-only deliberately bypasses stamp preparation in Holo.
  return rarity === 'Secret Rare' ? 'ygo-secret-early-tcg' : rarity === 'Ultra Rare' ? 'ygo-ultra' : 'ygo-super';
}
export function yugiohDefinition(card: YugiohCard): CardDefinition {
  const root = `/cards/yugioh/lob-first-edition/maps/${card.number}`;
  const bounds = registration[card.number as keyof typeof registration];
  if (!bounds) throw new Error(`No physical registration for ${card.number}`);
  const titleFoil = card.treatment.name === 'rainbow', metallic = card.treatment.name === 'silver' || card.treatment.name === 'gold';
  return { id: card.id, title: card.name, franchise: 'Yu-Gi-Oh!',
    set: `Legend of Blue Eyes White Dragon · NA 2002 · 1st Edition${card.source.fidelity === 'general-image-fallback' ? ' · Image fallback' : ''}`,
    number: card.number, dimensions: DIMENSIONS.yugioh, front: card.front, back: '/cards/yugioh/back-en.png',
    profile: profileFor(card.rarity), seed: Number(card.passcode),
    ...(card.rarity === 'Secret Rare' ? { yugioh: { rarity: 'Secret Rare' as const, era: 'early-tcg' as const, materialProfile: 'ygo-secret-early-tcg' as const } } : {}),
    layout: { artwork: bounds.artwork as [number, number, number, number], innerFrame: [.04,.024,.96,.976] },
    maps: { foil: `${root}-foil.png`, stamp: `${root}-stamp.png`,
      ...(metallic ? { metallic: `${root}-name.png` } : {}), ...(titleFoil ? { secondaryFoil: `${root}-name.png` } : {}) },
    // Leave Secret Rare's optical implementation entirely to its printing profile.
    ...(card.rarity === 'Rare' ? { profileOverrides: { metallicInk: { color: [.82,.84,.86] as [number,number,number], roughness: .25, metalness: .95 } } } : {}),
    source: { image: card.source.image, metadata: card.source.metadata,
      notes: `${card.source.notes} Target printing: ${card.printingId}. ${card.rarity}; ${card.distribution}. Registered masks are estimates from the cached scan. Early gold security mark uses the existing independent stamp response; baked scan reflection is retained, not replaced by a static rainbow.` },
  };
}
