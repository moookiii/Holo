import type { PokemonRecipe } from './recipes.ts';
import { prismaticSet } from './PrismaticCatalog.ts';
import { basicEnergyCards } from './energy.ts';
import type { PokemonCard } from './types.ts';

export const prismaticEnergyCards: readonly PokemonCard[] = basicEnergyCards.map(card => ({
  ...card, variants: ['normal', 'reverse'], foil: { reverse: 'sheen' }, category: 'Energy', energyType: 'Normal',
}));

/** TCGplayer's 1,200+ pack sample, 2025-01-17 with 2025-01-27 caveat.
 * The SIR marginal may include demigod packs. This models independent ordinary
 * packs, not undocumented God/Demigod event rates or factory print sheets.
 * Standard reverses remain real outcomes while their renderer is deferred.
 */
export const prismaticRecipe: PokemonRecipe = {
  id: 'sv08.5-english-retail', version: '1', setId: 'sv08.5', era: 'sv',
  requiredCardIds: prismaticSet.cardIds, energyCards: prismaticEnergyCards,
  sources: [
    'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Prismatic-Evolutions-Pull-Rates/d94889ea-f76a-4a13-b74d-5b0b071220a7/?source=syndication',
    'https://api.tcgdex.net/v2/en/sets/sv08.5',
    'https://www.pokebeach.com/2025/01/prismatic-evolutions-set-guide-full-card-list-secret-rares-cut-cards-products-and-more',
  ],
  note: '10 expansion cards + 1 Basic Energy · observed pull-rate estimates; uniform cards within each pool. God/Demigod packs are not simulated.',
  slots: [
    { id: 'common', count: 4, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal' }] },
    { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
    { id: 'reverse', count: 1, pool: 'set-and-energy', outcomes: [
      { weight: 1 - .3310 - .0468, rarities: ['Common', 'Uncommon', 'Rare', 'Energy'], variant: 'reverse' },
      { weight: .3310, rarities: ['Common', 'Uncommon', 'Rare'], variant: 'pokeball-reverse' },
      { weight: .0468, rarities: ['ACE SPEC Rare'], variant: 'holo' },
    ] },
    { id: 'reverse-replacement', count: 1, pool: 'set-and-energy', outcomes: [
      { weight: 1 - .0492 - .0222 - .0056, rarities: ['Common', 'Uncommon', 'Rare', 'Energy'], variant: 'reverse' },
      { weight: .0492, rarities: ['Common', 'Uncommon', 'Rare'], categories: ['Pokemon'], variant: 'masterball-reverse' },
      { weight: .0222, rarities: ['Special Illustration Rare'], variant: 'holo' },
      { weight: .0056, rarities: ['Hyper Rare'], variant: 'holo' },
    ] },
    { id: 'rare', count: 1, outcomes: [
      { weight: 1 - .1651 - .0746, rarities: ['Rare'], variant: 'holo' },
      { weight: .1651, rarities: ['Double Rare'], variant: 'holo' },
      { weight: .0746, rarities: ['Ultra Rare'], variant: 'holo' },
    ] },
    { id: 'energy', count: 1, pool: 'energy', outcomes: [{ weight: 1, rarities: ['Energy'], variant: 'normal' }] },
  ],
};
