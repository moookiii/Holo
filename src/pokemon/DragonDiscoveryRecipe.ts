import { dragonDiscoveryCards, DRAGON_DISCOVERY_ID } from './DragonDiscoveryCatalog.ts';
import type { PokemonRecipe } from './recipes.ts';

export const dragonDiscoveryRecipe: PokemonRecipe = {
  id: 'mcdonalds-dragon-discovery-english', version: '1.0.0', setId: DRAGON_DISCOVERY_ID, era: 'sv', boosterIds: ['english'],
  requiredCardIds: dragonDiscoveryCards.map(card => card.id),
  slots: [
    { id: 'confetti-holo', count: 1, outcomes: [{ weight: 1, rarities: ['Promo'], variant: 'holo', cardIds: dragonDiscoveryCards.filter(card => card.variants.includes('holo')).map(card => card.id) }] },
    { id: 'non-holo', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Promo'], variant: 'normal', cardIds: dragonDiscoveryCards.filter(card => card.variants.includes('normal')).map(card => card.id) }] },
  ],
  sources: [
    'https://corporate.mcdonalds.com/corpmcd/our-stories/article/pokemon-themed-happy-meal.html',
    'https://www.pokebeach.com/2025/01/mcdonalds-dragon-discovery-now-available-in-the-u-s-full-set-list-earn-pocket-rewards',
  ],
  note: 'Four cards: one confetti holo and three non-holos. Selection odds are estimated.',
};
