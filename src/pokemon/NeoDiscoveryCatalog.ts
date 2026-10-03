import { localBoosterArt } from './boosterArt.ts';
import { neoDiscoveryRecords } from './data/neo-discovery.generated.ts';
import { neoDiscoveryWrapper } from './NeoDiscoveryProduct.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const NEO_DISCOVERY_ID = 'neo2';
export const neoDiscoveryCards: readonly PokemonCard[] = neoDiscoveryRecords.map(record => {
  const n = Number(record.localId), holo = n <= 17;
  const editionFronts = {
    'first-edition': `/cards/pokemon/neo-discovery/${record.front}`,
  };
  return { ...record, setId: NEO_DISCOVERY_ID, setName: 'Neo Discovery', seriesId: 'neo', seriesName: 'Neo', era: 'neo',
    rarity: holo ? 'Holo Rare' : record.rarity,
    variants: [holo ? 'holo' : 'normal'], edition: 'first-edition', editionFronts,
    boosterIds: neoDiscoveryWrapper.designs.map(d => d.id),
    front: editionFronts['first-edition'], thumbnail: editionFronts['first-edition'] };
});
export const neoDiscoverySet: PokemonSet = {
  id: NEO_DISCOVERY_ID, name: 'Neo Discovery', series: { id: 'neo', name: 'Neo' }, era: 'neo', releaseDate: '2001-06-01',
  logo: '/packs/pokemon/neo2-logo.png', symbol: '/packs/pokemon/neo2-symbol.png', cardIds: neoDiscoveryCards.map(c => c.id), boosters: localBoosterArt(NEO_DISCOVERY_ID)!,
};
const byId = new Map(neoDiscoveryCards.map(c => [c.id, c]));
export function neoDiscoveryCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Neo Discovery card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], editionFronts: { ...card.editionFronts }, ...(card.types ? { types: [...card.types] } : {}) };
}
