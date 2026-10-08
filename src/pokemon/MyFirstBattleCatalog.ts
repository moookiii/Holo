import { mfbRecords } from './data/mfb.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';
import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';

export const myFirstBattleCards: readonly PokemonCard[] = mfbRecords.map(record => ({
  ...record, setId: 'mfb', setName: 'My First Battle', seriesId: 'sv', seriesName: 'Scarlet & Violet',
  era: 'sv', rarity: 'None', variants: ['normal'],
  front: `/cards/pokemon/mfb/${record.id}.jpg`, thumbnail: `/cards/pokemon/mfb/${record.id}.jpg`,
}));
export const myFirstBattleSet: PokemonSet = {
  id: 'mfb', name: 'My First Battle', series: { id: 'sv', name: 'Scarlet & Violet' }, era: 'sv',
  releaseDate: '2023-09-29', cardIds: myFirstBattleCards.map(card => card.id), boosters: [],
};
export function myFirstBattleCard(id: string) {
  const card = myFirstBattleCards.find(card => card.id === id);
  if (!card) throw new Error(`Unknown My First Battle card: ${id}`);
  return { ...card, variants: [...card.variants] };
}
export function myFirstBattleDefinition(card: PokemonCard): CardDefinition {
  return { id: `pokemon:${card.id}:normal`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: '', dimensions: DIMENSIONS.standard, front: card.front!, back: '/cards/pokemon/mfb/back.png',
    profile: 'print-only', seed: 1741, pokemon: { ...card, variant: 'normal', materialProfile: 'print-only' } };
}
