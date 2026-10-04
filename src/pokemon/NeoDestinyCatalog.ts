import { localBoosterArt } from './boosterArt.ts';
import { neoDestinyRecords } from './data/neo-destiny.generated.ts';
import { neoDestinyWrapper } from './NeoDestinyProduct.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const NEO_DESTINY_ID = 'neo4';
export const neoDestinyShiningIds: ReadonlySet<string> = new Set(Array.from({ length: 8 }, (_, i) => `neo4-${106+i}`));
export const neoDestinyCards: readonly PokemonCard[] = neoDestinyRecords.map(record => {
  const holo = record.variants.holo;
  const shining = neoDestinyShiningIds.has(record.id);
  const editionFronts = {
    'first-edition': `/cards/pokemon/neo-destiny/${record.front}`,
  };
  const { variants: apiVariants, ...metadata } = record;
  return { ...metadata, setId: NEO_DESTINY_ID, setName: 'Neo Destiny', seriesId: 'neo', seriesName: 'Neo', era: 'neo',
    rarity: shining ? 'Shining Rare' : holo ? 'Holo Rare' : record.rarity,
    variants: [holo ? 'holo' : 'normal'], edition: 'first-edition', editionFronts,
    boosterIds: neoDestinyWrapper.designs.map(d => d.id),
    front: editionFronts['first-edition'], thumbnail: editionFronts['first-edition'] };
});
export const neoDestinySet: PokemonSet = {
  id: NEO_DESTINY_ID, name: 'Neo Destiny', series: { id: 'neo', name: 'Neo' }, era: 'neo', releaseDate: '2002-02-28',
  logo: '/packs/pokemon/neo4-logo.png', symbol: '/packs/pokemon/neo4-symbol.png', cardIds: neoDestinyCards.map(c => c.id), boosters: localBoosterArt(NEO_DESTINY_ID)!,
};
const byId = new Map(neoDestinyCards.map(c => [c.id, c]));
export function neoDestinyCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Neo Destiny card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], editionFronts: { ...card.editionFronts }, ...(card.types ? { types: [...card.types] } : {}) };
}
