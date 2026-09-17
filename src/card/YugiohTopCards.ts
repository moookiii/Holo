import type { CardDefinition, CardMapPaths } from './CardDefinition';
import sources from '../../public/cards/yugioh-top-holos/sources.json' with { type: 'json' };
import { firstTenDesigns } from './YugiohFirstTenDesigns.ts';
import { nextTenDesigns } from './YugiohNextTenDesigns.ts';
import { remainingDesigns } from './YugiohRemainingDesigns.ts';

const dimensions = { width: 5.9, height: 8.6, thickness: 0.031, cornerRadius: 0.1, bevel: 0.006 };
const layout = { artwork: [96 / 813, 205 / 1185, 730 / 813, 848 / 1185], innerFrame: [30 / 813, 28 / 1185, 783 / 813, 1157 / 1185] } as const;
const root = '/cards/yugioh-top-holos';
const cardDesigns = { ...firstTenDesigns, ...nextTenDesigns, ...remainingDesigns };

function maps(slug: string, profile: string): CardMapPaths {
  const title = `${root}/maps/${slug}-name.png`;
  const result: CardMapPaths = {
    foil: '/cards/shared/yugioh-standard/artwork.svg?v=3',
    laminate: '/cards/shared/yugioh-standard/laminate.svg?v=1',
  };
  if (['ygo-ultra', 'ygo-ultimate', 'ygo-quarter-century'].includes(profile)) result.metallic = title;
  if (['ygo-secret', 'ygo-prismatic-secret', 'ygo-starlight', 'ygo-collector'].includes(profile)) result.secondaryFoil = title;
  if (['ygo-starlight', 'ygo-quarter-century', 'ygo-collector'].includes(profile)) {
    result.extendedFoil = '/cards/shared/yugioh-standard/extended.svg?v=2';
  }
  if (profile !== 'ygo-super') result.height = `${root}/maps/${slug}-height.png`;
  if (cardDesigns[slug]) {
    result.stamp = '/cards/shared/yugioh-standard/designed-stamp.svg';
    if (result.extendedFoil) result.extendedFoil = '/cards/shared/yugioh-standard/designed-parallel.svg';
  }
  return result;
}

export const yugiohTopCards: CardDefinition[] = sources.map(card => ({
  id: `holo-yugioh-top-${card.slug}`,
  title: card.title,
  franchise: 'Yu-Gi-Oh!',
  set: `${card.setCode} · ${card.rarity}`,
  number: card.setCode,
  dimensions,
  layout: { artwork: [...layout.artwork], innerFrame: [...layout.innerFrame] },
  // Bump the local URL when replacing a card front so an already-open viewer
  // cannot keep serving the previous image from the browser cache.
  front: `${root}/${card.slug}.jpg${card.slug === 'pot-of-sloth' ? '?v=replica' : ''}`,
  back: '/cards/yugioh/back-en.png',
  maps: maps(card.slug, card.profile),
  mapSettings: { embossStrength: card.profile === 'ygo-ultimate' ? .24 : .12 },
  profile: card.profile,
  profileOverrides: cardDesigns[card.slug],
  seed: 2026000 + card.rank * 101 + Number(card.passcode) % 997,
  source: {
    image: card.image,
    metadata: card.metadata,
    notes: `Rank ${card.rank} at ${card.usage} usage in 263 topping TCG decklists during the captured last-month window. YGOPRODeck verifies ${card.setCode} as ${card.rarity}. Clean standard front, registered title mask and individual optical tuning are assigned; physical-reference matching remains pending. Ranking source: ${card.rankingSource}`,
  },
}));

export const yugiohTopCardIds = yugiohTopCards.map(card => card.id);
