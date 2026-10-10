import type { PokemonCard } from './types.ts';

const names = ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal'];
const pools = new Map<number, readonly PokemonCard[]>();
/** Unnumbered pack inserts: original design through Fusion Strike, 2022 design
 * from Brilliant Stars onward. Sources/hashes: swsh-energy/sources.json. */
export function swshPackEnergy(setId: string): readonly PokemonCard[] {
  if (setId === 'swsh7-5') return [];
  const year = ['swsh9', 'swsh10', 'swsh10-5', 'swsh11', 'swsh12', 'swsh12-5'].includes(setId) ? 2022 : 2020;
  if (!pools.has(year)) pools.set(year, names.map((name, i) => ({
    id: `swsh-energy-${year}-${name.toLowerCase()}`, localId: String(i + 1),
    name: `${name} Energy`, setId: `swsh-energy-${year}`, setName: `Sword & Shield Energy (${year})`,
    seriesId: 'swsh', seriesName: 'Sword & Shield', era: 'swsh', rarity: 'Energy',
    category: 'Energy', energyType: 'Normal', types: [name], variants: ['normal'],
    front: `/cards/pokemon/swsh-energy/${year}/${name.toLowerCase()}.png`,
    thumbnail: `/cards/pokemon/swsh-energy/${year}/${name.toLowerCase()}.png`,
  })));
  return pools.get(year)!;
}
