import { pokemon151Records } from './data/151.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';
import { localBoosterArt } from './boosterArt.ts';

export const POKEMON_151_ID = 'sv03.5';
export const POKEMON_151_ASSETS = '/cards/pokemon/151';
export const pokemon151Cards: readonly PokemonCard[] = pokemon151Records.map(record => ({
  ...record, setId: POKEMON_151_ID, setName: '151', seriesId: 'sv', seriesName: 'Scarlet & Violet', era: 'sv',
  variants: [...record.variants], types: [...record.types], foil: { ...record.foil },
  front: `${POKEMON_151_ASSETS}/${record.front}`, thumbnail: `${POKEMON_151_ASSETS}/${record.front}`,
}));
export const pokemon151Set: PokemonSet = {
  id: POKEMON_151_ID, name: '151', series: { id: 'sv', name: 'Scarlet & Violet' },
  era: 'sv', releaseDate: '2023-09-22', cardIds: pokemon151Cards.map(card => card.id),
  logo: 'https://assets.tcgdex.net/en/sv/sv03.5/logo.webp', boosters: localBoosterArt(POKEMON_151_ID)!,
};
const byId = new Map(pokemon151Cards.map(card => [card.id, card]));
export function pokemon151Card(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown 151 card: ${id}`);
  return { ...card, variants: [...card.variants], types: card.types ? [...card.types] : undefined, foil: { ...card.foil } };
}
