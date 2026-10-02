import type { CardDefinition } from './CardDefinition.ts';
import { legendaryCollectionCards } from '../pokemon/LegendaryCollectionCatalog.ts';

/** Registered source-set artwork cutouts; the paths remain owned by their original sets. */
const reusedHoloMaps: Readonly<Record<number, { foil: string; protection?: string; laminate?: string }>> = {
  1: { foil: '/cards/pokemon/base-set/alakazam/foil.png', laminate: '/cards/pokemon/base-set/alakazam/laminate.png' },
  2: { foil: '/cards/pokemon/fossil/maps/2-foil.png', protection: '/cards/pokemon/fossil/maps/2-protection.png' },
  3: { foil: '/cards/charizard-base-set/foil.png', laminate: '/cards/charizard-base-set/laminate.png' },
  4: { foil: '/cards/pokemon/team-rocket/maps/3-unlimited-foil.png', protection: '/cards/pokemon/team-rocket/maps/3-unlimited-protection.png' },
  5: { foil: '/cards/pokemon/team-rocket/maps/5-unlimited-foil.png', protection: '/cards/pokemon/team-rocket/maps/5-unlimited-protection.png' },
  7: { foil: '/cards/pokemon/team-rocket/maps/83-unlimited-foil.png', protection: '/cards/pokemon/team-rocket/maps/83-unlimited-protection.png' },
  8: { foil: '/cards/pokemon/team-rocket/maps/12-unlimited-foil.png', protection: '/cards/pokemon/team-rocket/maps/12-unlimited-protection.png' },
  10: { foil: '/cards/pokemon/jungle/maps/3-foil.png', protection: '/cards/pokemon/jungle/maps/3-protection.png' },
  11: { foil: '/cards/pokemon/fossil/maps/5-foil.png', protection: '/cards/pokemon/fossil/maps/5-protection.png' },
  12: { foil: '/cards/pokemon/base-set/gyarados/foil.png', laminate: '/cards/pokemon/base-set/gyarados/laminate.png' },
  13: { foil: '/cards/pokemon/fossil/maps/7-foil.png', protection: '/cards/pokemon/fossil/maps/7-protection.png' },
  14: { foil: '/cards/pokemon/jungle/maps/4-foil.png', protection: '/cards/pokemon/jungle/maps/4-protection.png' },
  15: { foil: '/cards/pokemon/base-set/machamp/foil.png', laminate: '/cards/pokemon/base-set/machamp/laminate.png' },
  16: { foil: '/cards/pokemon/fossil/maps/13-foil.png', protection: '/cards/pokemon/fossil/maps/13-protection.png' },
  17: { foil: '/cards/pokemon/base-set/ninetales/foil.png', laminate: '/cards/pokemon/base-set/ninetales/laminate.png' },
  18: { foil: '/cards/pokemon/base-set/venusaur/foil.png', laminate: '/cards/pokemon/base-set/venusaur/laminate.png' },
  19: { foil: '/cards/pokemon/fossil/maps/15-foil.png', protection: '/cards/pokemon/fossil/maps/15-protection.png' },
};
export const legendaryCollectionReusedHoloMaps = reusedHoloMaps;
const base = '/cards/pokemon/legendary-collection/maps';
const dimensions = { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 };

export const legendaryCollectionDefinitions: CardDefinition[] = legendaryCollectionCards.flatMap(card => {
  const number = Number(card.localId);
  const holo = number <= 19;
  const lcHoloMaps = number === 6 || number === 9 ? {
    foil: `${base}/${number}-holo-foil.png`, protection: `${base}/${number}-holo-protection.png`,
    motif: `${base}/${number}-holo-stars.png`, laminate: `${base}/${number}-holo-laminate.png`,
  } : undefined;
  const regularProfile = holo ? 'pokemon-base-set-star' : 'print-only';
  const regularMaps = holo ? { ...(reusedHoloMaps[number] ?? lcHoloMaps), motif: `${base}/${number}-holo-stars.png` } : undefined;
  const source = { image: `https://assets.tcgdex.net/en/lc/lc/${number}/high.png`, metadata: `https://api.tcgdex.net/v2/en/cards/lc-${number}`,
    notes: holo ? reusedHoloMaps[number] ? 'LC print with registered source-set artwork cutout reused by path. Vintage holo profile; LC print differences remain separate.'
      : 'LC-specific holo subject cutout rasterized from the user-supplied green contour; manually registered star motif. Source-set non-holo maps remain unchanged.'
      : 'English unlimited retail numbered LC front; reverse printing is a separate definition.' };
  const regular: CardDefinition = {
    id: `pokemon:${card.id}:${holo ? 'holo' : 'normal'}`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${number}/110 · ${holo ? 'Holo' : 'Non-holo'}`, dimensions,
    front: card.front!, back: '/cards/pokemon/back.jpg', profile: regularProfile, seed: 2002000 + number,
    ...(regularMaps ? { maps: regularMaps, mapSettings: { embossStrength: 0 }, substrate: { color: [0, 0, 0] as [number, number, number], printRetention: 1 } } : {}),
    layout: { artwork: [55/600, 86/825, 547/600, 437/825], innerFrame: [23/600, 22/825, 578/600, 803/825] },
    pokemon: { ...card, variant: holo ? 'holo' : 'normal', materialProfile: regularProfile }, source,
  };
  const reverse: CardDefinition = {
    id: number === 74 ? 'eevee-legendary-reverse' : `pokemon:${card.id}:reverse`,
    title: card.name, franchise: 'Pokémon', set: card.setName, number: `${number}/110 · Reverse holo`, dimensions,
    front: number === 74 ? '/cards/eevee-legendary-reverse/front.png'
      : holo ? `/cards/pokemon/legendary-collection/${number}-reverse.png` : card.front!,
    back: '/cards/pokemon/back.jpg', profile: 'pokemon-legendary-reverse', seed: number === 74 ? 2002074 : 2002074 + number,
    coverageMode: 'reverse', frontBorderColor: [.579, .579, .579],
    substrate: { color: [.32, .33, .34], backgroundColor: [.672, .672, .672], printRetention: 0 },
    maps: { reverseFoil: `${base}/reverse-${card.category?.toLowerCase() ?? 'pokemon'}-foil.png`,
      protection: number === 74 ? '/cards/eevee-legendary-reverse/protection.png' : `${base}/${number}-reverse-protection.png`,
      ...(number === 74 ? { laminate: `${base}/74-reverse-laminate.png` } : {}) },
    layout: { artwork: card.category === 'Trainer' ? [55/600,190/825,551/600,461/825] : card.category === 'Energy'
      ? [22/600,120/825,578/600,602/825] : [55/600,86/825,547/600,437/825],
      innerFrame: [23/600,22/825,578/600,803/825] },
    pokemon: { ...card, variant: 'reverse', materialProfile: 'pokemon-legendary-reverse' },
    source: { ...source, notes: number === 74 ? 'Existing Eevee print and hand-registered protection reused; shared LC PNG reverse body coverage.'
      : 'LC clean front with shared category-specific artwork exclusion and LC-specific printed-ink protection estimate. Fireworks optics deferred.' },
  };
  return [regular, reverse];
});
