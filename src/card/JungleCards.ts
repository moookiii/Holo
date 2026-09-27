import type { CardDefinition } from './CardDefinition.ts';
import { jungleCards, JUNGLE_ASSETS } from '../pokemon/JungleCatalog.ts';

export const jungleHoloProfile = 'pokemon-base-set-star';
export const jungleReadyHolos: ReadonlySet<string> = new Set(['1', '2', '3', '4', '5', '6']);

/** Each numbered front is a distinct printing, including the non-holo rares. */
export const jungleDefinitions: CardDefinition[] = jungleCards.map(card => {
  const holo = card.variants[0] === 'holo';
  const ready = holo && jungleReadyHolos.has(card.localId);
  const pending = holo && !ready;
  const profile = ready ? jungleHoloProfile : 'print-only';
  const maps = `${JUNGLE_ASSETS}/maps/${card.localId}`;
  return {
    id: `pokemon:${card.id}:${holo ? 'holo' : 'normal'}`, title: card.name, franchise: 'Pokémon', set: 'Jungle', number: `${card.localId}/64${holo ? ` · Holo${pending ? ' · cutouts pending' : ''}` : ''}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 199900 + Number(card.localId),
    ...(ready ? { maps: { foil: `${maps}-foil.png`, protection: `${maps}-protection.png`, laminate: `${maps}-laminate.png` },
      mapSettings: { embossStrength: 0 }, substrate: { color: [0, 0, 0] as [number, number, number], printRetention: 1 } } : {}),
    layout: { artwork: [65/600, 101/825, 536/600, 423/825], innerFrame: [23/600, 22/825, 578/600, 803/825] },
    pokemon: { ...card, variant: holo ? 'holo' : 'normal', materialProfile: profile, ...(pending ? { treatmentStatus: 'deferred' as const } : {}) },
    source: { image: `https://assets.tcgdex.net/en/base/base2/${card.localId}/high.png`, metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: ready ? 'Original English Jungle front with user-traced opaque-print protection and picture-window foil coverage, rasterized to separate PNG maps. Existing Base Set star holo; no relief.'
        : holo ? `Original English Jungle holo print from TCGdex. Cutouts deferred by user; intended material ${jungleHoloProfile}. Print-only rendering until PNG coverage and protection are authored.`
        : 'Original English numbered Jungle non-holo print from TCGdex; separate from its holo counterpart.' },
  };
});
