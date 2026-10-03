import { localBoosterArt } from './boosterArt.ts';
import { neoGenesisRecords } from './data/neo-genesis.generated.ts';
import { neoGenesisWrapper } from './NeoGenesisProduct.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const NEO_GENESIS_ID = 'neo1';
export const neoGenesisCards: readonly PokemonCard[] = neoGenesisRecords.map(record => {
  const n = Number(record.localId), holo = n <= 19;
  const editionFronts = {
    'first-edition': `/cards/pokemon/neo-genesis/${record.front}`,
  };
  return { ...record, setId: NEO_GENESIS_ID, setName: 'Neo Genesis', seriesId: 'neo', seriesName: 'Neo', era: 'neo',
    rarity: holo ? 'Holo Rare' : record.rarity,
    variants: [holo ? 'holo' : 'normal'], edition: 'first-edition', editionFronts,
    boosterIds: neoGenesisWrapper.designs.map(d => d.id),
    front: editionFronts['first-edition'], thumbnail: editionFronts['first-edition'] };
});
export const neoGenesisSet: PokemonSet = {
  id: NEO_GENESIS_ID, name: 'Neo Genesis', series: { id: 'neo', name: 'Neo' }, era: 'neo', releaseDate: '2000-12-16',
  logo: '/packs/pokemon/neo1-logo.png', cardIds: neoGenesisCards.map(c => c.id), boosters: localBoosterArt(NEO_GENESIS_ID)!,
};
const byId = new Map(neoGenesisCards.map(c => [c.id, c]));
export function neoGenesisCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Neo Genesis card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], editionFronts: { ...card.editionFronts }, ...(card.types ? { types: [...card.types] } : {}) };
}
