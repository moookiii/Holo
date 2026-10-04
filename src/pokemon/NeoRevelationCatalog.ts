import { localBoosterArt } from './boosterArt.ts';
import { neoRevelationRecords } from './data/neo-revelation.generated.ts';
import { neoRevelationWrapper } from './NeoRevelationProduct.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const NEO_REVELATION_ID = 'neo3';
export const neoRevelationShiningIds: ReadonlySet<string> = new Set(['neo3-65','neo3-66']);
export const neoRevelationCards: readonly PokemonCard[] = neoRevelationRecords.map(record => {
  const holo = record.variants.holo;
  const shining = neoRevelationShiningIds.has(record.id);
  const editionFronts = {
    'first-edition': `/cards/pokemon/neo-revelation/${record.front}`,
  };
  const { variants: apiVariants, ...metadata } = record;
  return { ...metadata, setId: NEO_REVELATION_ID, setName: 'Neo Revelation', seriesId: 'neo', seriesName: 'Neo', era: 'neo',
    rarity: shining ? 'Shining Rare' : holo ? 'Holo Rare' : record.rarity,
    variants: [holo ? 'holo' : 'normal'], edition: 'first-edition', editionFronts,
    boosterIds: neoRevelationWrapper.designs.map(d => d.id),
    front: editionFronts['first-edition'], thumbnail: editionFronts['first-edition'] };
});
export const neoRevelationSet: PokemonSet = {
  id: NEO_REVELATION_ID, name: 'Neo Revelation', series: { id: 'neo', name: 'Neo' }, era: 'neo', releaseDate: '2001-09-21',
  logo: '/packs/pokemon/neo3-logo.png', symbol: '/packs/pokemon/neo3-symbol.png', cardIds: neoRevelationCards.map(c => c.id), boosters: localBoosterArt(NEO_REVELATION_ID)!,
};
const byId = new Map(neoRevelationCards.map(c => [c.id, c]));
export function neoRevelationCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Neo Revelation card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], editionFronts: { ...card.editionFronts }, ...(card.types ? { types: [...card.types] } : {}) };
}
