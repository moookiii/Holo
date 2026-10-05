import type { PokemonCard, PokemonSet } from './types.ts';

/** August 2002 New York English samples, not E3 or Expedition printings. */
export const SAMPLE_SET_ID = 'sp';
export const SAMPLE_SET_NAME = 'Pokémon e-Card Sample Set';
const checklist = [
  ['002', 'Hoppip', 'Common', 'Grass', 'Basic'],
  ['004', 'Koffing', 'Common', 'Grass', 'Basic'],
  ['016', 'Pikachu', 'Common', 'Lightning', 'Basic'],
  ['019', 'Gastly', 'Common', 'Psychic', 'Basic'],
  ['021', 'Machop', 'Common', 'Fighting', 'Basic'],
  ['042', 'Machoke', 'Uncommon', 'Fighting', 'Stage1', 'Machop'],
  ['048', 'Chansey', 'Uncommon', 'Colorless', 'Basic'],
  ['074', 'Rapidash', 'Rare', 'Fire', 'Stage1', 'Ponyta'],
  ['083', 'Pichu', 'Rare', 'Lightning', 'Baby'],
  ['088', 'Machamp', 'Rare', 'Fighting', 'Stage2', 'Machoke'],
] as const;
export const sampleSetCards: readonly PokemonCard[] = checklist.map(([localId, name, rarity, type, stage, evolveFrom]) => {
  const front = `/cards/pokemon/sample-set/${localId}.jpg`;
  return { id: `${SAMPLE_SET_ID}-${localId}`, localId, name, rarity, category: 'Pokemon', types: [type], stage,
    ...(evolveFrom ? { evolveFrom } : {}), setId: SAMPLE_SET_ID, setName: SAMPLE_SET_NAME,
    seriesId: 'ecard', seriesName: 'E-Card', era: 'ecard', variants: ['normal'], boosterIds: [], front, thumbnail: front };
});
export const sampleSet: PokemonSet = {
  id: SAMPLE_SET_ID, name: SAMPLE_SET_NAME, series: { id: 'ecard', name: 'E-Card' }, era: 'ecard',
  // TCGdex's sorting date. Historical evidence establishes August, not the day.
  releaseDate: '2002-08-01', cardIds: sampleSetCards.map(card => card.id), boosters: [],
  symbol: '/cards/pokemon/sample-set/symbol.png', logo: '/cards/pokemon/sample-set/symbol.png',
};
export function sampleSetCard(id: string): PokemonCard {
  const card = sampleSetCards.find(card => card.id === id);
  if (!card) throw new Error(`Unknown e-Card Sample Set card: ${id}`);
  return { ...card, variants: [...card.variants], types: [...card.types!], boosterIds: [] };
}
