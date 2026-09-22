import type { PrintVariant } from './types.ts';

export interface SlotOutcome { weight: number; rarities: readonly string[]; variant: PrintVariant; cardIds?: readonly string[]; }
export interface PackSlot { id: string; count: number; outcomes: readonly SlotOutcome[]; unique?: boolean; }
export interface PokemonRecipe {
  id: string; version: string; setId: string; era: string; slots: readonly PackSlot[];
  boosterIds?: readonly string[]; sources: readonly string[]; note: string;
}
const ordinary = ['Common', 'Uncommon', 'Rare'];
const outcome = (weight: number, rarities: readonly string[], variant: PrintVariant): SlotOutcome => ({ weight, rarities, variant });

/** Only these two audited English products use this base. No era-wide fallback.
 * Empirical marginal rates, not official odds. Independent replacement slots;
 * uniform cards inside each pool and no duplicate print in the common/uncommon
 * group are modelling assumptions, not a reproduction of factory print sheets.
 * Ten expansion cards are simulated; unnumbered basic Energy/code inserts omitted.
 * Hyper placement follows TCGplayer's observed second-reverse slot, rather than
 * pre-release reports that placed gold in the rare slot. See docs/pokemon-packs.md.
 */
function earlySV(setId: string, rates: [number, number, number, number, number], source: string): PokemonRecipe {
  const [double, ultra, illustration, special, hyper] = rates;
  return { id: `${setId}-english-retail`, version: '1', setId, era: 'sv', sources: [source,
    'https://support.pokemon.com/hc/en-us/articles/360000981613-What-can-I-expect-in-a-Pok%C3%A9mon-Trading-Card-Game-booster-pack'],
    note: '10 expansion cards · observed pull-rate estimates · Energy/code inserts excluded. Uniform within pools; independent replacement slots.',
    slots: [
      { id: 'common', count: 4, unique: true, outcomes: [outcome(1, ['Common'], 'normal')] },
      { id: 'uncommon', count: 3, unique: true, outcomes: [outcome(1, ['Uncommon'], 'normal')] },
      { id: 'reverse', count: 1, outcomes: [outcome(1, ordinary, 'reverse')] },
      { id: 'reverse-replacement', count: 1, outcomes: [outcome(1 - illustration - special - hyper, ordinary, 'reverse'),
        outcome(illustration, ['Illustration Rare'], 'holo'), outcome(special, ['Special Illustration Rare'], 'holo'), outcome(hyper, ['Hyper Rare'], 'holo')] },
      { id: 'rare', count: 1, outcomes: [outcome(1 - double - ultra, ['Rare'], 'holo'), outcome(double, ['Double Rare'], 'holo'), outcome(ultra, ['Ultra Rare'], 'holo')] },
    ] };
}
export const pokemonRecipes: readonly PokemonRecipe[] = [
  earlySV('sv01', [.1376, .0657, .0767, .0315, .0185], 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Scarlet-Violet-Pull-Rates/a7702fce-dd64-4a58-beb1-0f871c853215/'),
  earlySV('sv02', [.1372, .0664, .0770, .0317, .0176], 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Paldea-Evolved-Pull-Rates/1b7d3e70-9542-4a50-8692-1661e2316521/'),
];
export const recipeFor = (setId: string) => pokemonRecipes.find(recipe => recipe.setId === setId);
