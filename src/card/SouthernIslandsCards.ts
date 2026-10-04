import type { CardDefinition } from './CardDefinition.ts';
import { southernIslandsCards } from '../pokemon/SouthernIslandsCatalog.ts';

export const southernIslandsDefinitions: CardDefinition[] = southernIslandsCards.map(card => {
  const reverse = card.variants.includes('reverse'), variant = reverse ? 'reverse' : 'normal';
  const profile = reverse ? 'pokemon-base-set-2-cosmos' : 'print-only';
  const maps = `/cards/pokemon/southern-islands/maps/${card.localId}`;
  return {
    id: `pokemon:${card.id}:${variant}`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${card.localId}/18 · ${reverse ? 'Cosmos reverse holo' : 'Non-holo'}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 2001000 + Number(card.localId),
    ...(reverse ? {
      maps: { foil: `${maps}-foil.png`, protection: `${maps}-protection.png`, motif: `${maps}-cosmos.png` },
      // Same restrained exterior-Cosmos response as Wizards Entei/Pichu.
      profileOverrides: { diffraction: { strength: .32 }, surface: { foilReflectance: .055, sheen: 0, laminate: .10 } },
      mapSettings: { embossStrength: 0 }, substrate: { color: [0,0,0] as [number,number,number], printRetention: 1 },
    } : {}),
    layout: { artwork: [54/600,93/825,545/600,434/825], innerFrame: [22/600,22/825,578/600,801/825] },
    pokemon: { ...card, variant, materialProfile: profile },
    source: { image: `https://assets.tcgdex.net/en/neo/${card.setId}/${card.localId}/high.png`,
      metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: 'Unmodified TCGdex English front. Physical English PSA references guide exterior Cosmos coverage; artwork, opaque glyphs and symbols protected independently. See docs/southern-islands.md.' },
  };
});
