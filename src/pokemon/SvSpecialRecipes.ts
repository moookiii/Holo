import type { PokemonRecipe, PackSlot, SlotOutcome } from './recipes.ts';
import { svTcglCards } from './SvTcglCatalog.ts';

const ordinary = ['Common', 'Uncommon', 'Rare'];
const hit = (weight: number, rarities: string[], variant: SlotOutcome['variant']): SlotOutcome => ({ weight, rarities, variant });
/** Exact numbered SVE fronts. 2023: 001–008; Stellar Crown onward: 009–016;
 * Black Bolt/White Flare: 017–024. Foil frequency is not inferred from counts. */
export function svPackEnergy(first: number) {
  return svTcglCards.filter(card => card.setId === 'sve' && card.variants.includes('normal') && Number(card.localId) >= first && Number(card.localId) < first + 8)
    .map(card => ({ ...card, rarity: 'Energy', variants: ['normal'] as ['normal'] }));
}
function recipe(setId: string, slots: PackSlot[], sources: string[], note: string): PokemonRecipe {
  return { id: `${setId}-english-retail`, version: '1', setId, era: 'sv',
    requiredCardIds: svTcglCards.filter(card => card.setId === setId).map(card => card.id),
    energyCards: svPackEnergy(setId.startsWith('sv10.5') ? 17 : 1), sources,
    note: '10 expansion cards + 1 Basic Energy · observed ordinary-pack rates. ' + note,
    slots: [
      { id: 'common', count: 4, unique: true, outcomes: [hit(1, ['Common'], 'normal')] },
      { id: 'uncommon', count: 3, unique: true, outcomes: [hit(1, ['Uncommon'], 'normal')] },
      ...slots,
      { id: 'energy', count: 1, pool: 'energy', outcomes: [hit(1, ['Energy'], 'normal')] },
    ] };
}
export const svSpecialRecipes: readonly PokemonRecipe[] = [
  recipe('sv04.5', [
    { id: 'reverse', count: 1, outcomes: [hit(1-.2544-.0772, ordinary, 'reverse'), hit(.2544, ['Shiny Rare'], 'holo'), hit(.0772, ['Shiny Ultra Rare'], 'holo')] },
    { id: 'reverse-replacement', count: 1, outcomes: [hit(1-.0722-.0172-.0161, ordinary, 'reverse'), hit(.0722, ['Illustration Rare'], 'holo'), hit(.0172, ['Special Illustration Rare'], 'holo'), hit(.0161, ['Hyper Rare'], 'holo')] },
    { id: 'rare', count: 1, outcomes: [hit(1-.1589-.0661, ['Rare'], 'holo'), hit(.1589, ['Double Rare'], 'holo'), hit(.0661, ['Ultra Rare'], 'holo')] },
  ], ['https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Paldean-Fates-Pull-Rates/23de3e93-0d0f-4ae0-abc4-13664f3001a3/'], 'Shiny Pokémon replace the first reverse; IR/SIR/gold replace the second.'),
  recipe('sv06.5', [
    { id: 'reverse', count: 1, outcomes: [hit(1-58/1008, ordinary, 'reverse'), hit(58/1008, ['ACE SPEC Rare'], 'holo')] },
    { id: 'reverse-replacement', count: 1, outcomes: [hit(1-(82+15+7)/1008, ordinary, 'reverse'), hit(82/1008, ['Illustration Rare'], 'holo'), hit(15/1008, ['Special Illustration Rare'], 'holo'), hit(7/1008, ['Hyper Rare'], 'holo')] },
    { id: 'rare', count: 1, outcomes: [hit(1-(170+72)/1008, ['Rare'], 'holo'), hit(170/1008, ['Double Rare'], 'holo'), hit(72/1008, ['Ultra Rare'], 'holo')] },
  ], ['https://www.youtube.com/watch?v=5WWtKPypLJ4'], 'Danny Phantump’s 1,008-pack sample. ACE SPEC replaces the first reverse.'),
  ...['sv10.5b','sv10.5w'].map(setId => recipe(setId, [
    { id: 'reverse', count: 1, outcomes: [hit(1-.3056-.0514, ordinary, 'reverse'), hit(.3056, ordinary, 'pokeball-reverse'), { ...hit(.0514, ordinary, 'masterball-reverse'), categories: ['Pokemon'] }] },
    { id: 'reverse-replacement', count: 1, outcomes: [hit(1-.1639-.0125, ordinary, 'reverse'), hit(.1639, ['Illustration Rare'], 'holo'), hit(.0125, ['Special Illustration Rare'], 'holo')] },
    { id: 'rare', count: 1, outcomes: [hit(1-.2111-.0583, ['Rare'], 'holo'), hit(.2111, ['Double Rare'], 'holo'), hit(.0583, ['Ultra Rare'], 'holo')] },
  ], ['https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Black-Bolt-and-White-Flare-Pull-Rates/bac92199-a2a7-4668-b4a4-2647a111776f'], 'Combined 720-pack sample. Both Ball foils occupy the first reverse. Unmeasured BWR, God-pack and foil-Energy odds are not guessed.')),
];
