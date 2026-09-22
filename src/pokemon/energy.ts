import type { PokemonCard } from './types.ts';

const names = ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal'];

/** TCGdex identifies these prints but does not publish their images. The local
 * fronts are the matching Scarlet & Violet Energy prints from pokemontcg.io. */
export const basicEnergyCards: readonly PokemonCard[] = names.map((name, index) => ({
  id: `sve-${String(index + 1).padStart(3, '0')}`,
  localId: String(index + 1).padStart(3, '0'),
  name: `${name} Energy`,
  setId: 'sve',
  setName: 'Scarlet & Violet Energy',
  seriesId: 'sv',
  seriesName: 'Scarlet & Violet',
  era: 'sv',
  rarity: 'Energy',
  variants: ['normal', 'holo'],
  foil: { holo: 'Cosmos Holo' },
  front: `/cards/pokemon/energy/${index + 1}.png`,
  thumbnail: `/cards/pokemon/energy/${index + 1}.png`,
}));
