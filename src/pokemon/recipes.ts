import type { PokemonCard, PrintVariant } from './types.ts';

export interface SlotOutcome { weight: number; rarities: readonly string[]; variant: PrintVariant; cardIds?: readonly string[]; excludedCardIds?: readonly string[]; categories?: readonly string[]; energyTypes?: readonly string[]; }
export interface PackSlot { id: string; count: number; outcomes: readonly SlotOutcome[]; unique?: boolean; pool?: 'set' | 'energy' | 'set-and-energy'; }
export interface PokemonRecipe {
  id: string; version: string; setId: string; era: string; slots: readonly PackSlot[];
  boosterIds?: readonly string[]; sources: readonly string[]; note: string;
  /** Audited local pools reject incomplete metadata instead of biasing odds. */
  requiredCardIds?: readonly string[];
  /** Product-specific Energy finishes; never added to another set's energy pool. */
  energyCards?: readonly PokemonCard[];
}
const ordinary = ['Common', 'Uncommon', 'Rare'];
const outcome = (weight: number, rarities: readonly string[], variant: PrintVariant): SlotOutcome => ({ weight, rarities, variant });

/** Only explicitly audited English products use this base. No era-wide fallback.
 * Empirical marginal rates, not official odds. Independent replacement slots;
 * uniform cards inside each pool and no duplicate print in the common/uncommon
 * group are modelling assumptions, not a reproduction of factory print sheets.
 * Ten expansion cards plus a Basic Energy are simulated; code inserts omitted.
 * Hyper placement follows TCGplayer's observed second-reverse slot, rather than
 * pre-release reports that placed gold in the rare slot. See docs/pokemon-packs.md.
 */
function scarletViolet(setId: string, rates: [number, number, number, number, number], source: string, aceSpec = 0, extraNote = '', foilEnergy = 0): PokemonRecipe {
  const [double, ultra, illustration, special, hyper] = rates;
  return { id: `${setId}-english-retail`, version: '1', setId, era: 'sv', sources: [source,
    'https://support.pokemon.com/hc/en-us/articles/360000981613-What-can-I-expect-in-a-Pok%C3%A9mon-Trading-Card-Game-booster-pack'],
    note: '10 expansion cards + 1 Basic Energy · observed pull-rate estimates · code insert excluded. Uniform within pools; independent replacement slots.' + extraNote,
    slots: [
      { id: 'common', count: 4, unique: true, outcomes: [outcome(1, ['Common'], 'normal')] },
      { id: 'uncommon', count: 3, unique: true, outcomes: [outcome(1, ['Uncommon'], 'normal')] },
      { id: 'reverse', count: 1, outcomes: [outcome(1 - aceSpec, ordinary, 'reverse'),
        ...(aceSpec ? [outcome(aceSpec, ['ACE SPEC Rare'], 'holo')] : [])] },
      { id: 'reverse-replacement', count: 1, outcomes: [outcome(1 - illustration - special - hyper, ordinary, 'reverse'),
        outcome(illustration, ['Illustration Rare'], 'holo'), outcome(special, ['Special Illustration Rare'], 'holo'), outcome(hyper, ['Hyper Rare'], 'holo')] },
      { id: 'rare', count: 1, outcomes: [outcome(1 - double - ultra, ['Rare'], 'holo'), outcome(double, ['Double Rare'], 'holo'), outcome(ultra, ['Ultra Rare'], 'holo')] },
      { id: 'energy', count: 1, pool: 'energy', outcomes: foilEnergy
        ? [outcome(1 - foilEnergy, ['Energy'], 'normal'), outcome(foilEnergy, ['Energy'], 'holo')]
        : [outcome(1, ['Energy'], 'normal')] },
    ] };
}
export const pokemonRecipes: readonly PokemonRecipe[] = [
  { id: 'base1-english-retail', version: '1', setId: 'base1', era: 'base',
    sources: ['https://www.cs.sjsu.edu/~stamp/cv/papers/pokemon.pdf', 'https://www.pokebeach.com/tcg/base-set/theme-decks'],
    note: '1999 Base Set · 5 commons + 2 in-set Basic Energy + 3 uncommons + 1 rare · no reverse · holo rate estimated at 1 in 3 packs.',
    slots: [
      { id: 'common', count: 5, unique: true, outcomes: [{ ...outcome(1, ['Common'], 'normal'), categories: ['Pokemon', 'Trainer'] }] },
      { id: 'energy', count: 2, outcomes: [{ ...outcome(1, ['Common'], 'normal'), categories: ['Energy'], energyTypes: ['Normal'] }] },
      { id: 'uncommon', count: 3, unique: true, outcomes: [outcome(1, ['Uncommon'], 'normal')] },
      { id: 'rare', count: 1, outcomes: [
        outcome(2 / 3, ['Rare'], 'normal'),
        { ...outcome(1 / 3, ['Holo Rare'], 'holo'), excludedCardIds: ['base1-8'] },
      ] },
    ] },
  scarletViolet('sv01', [.1376, .0657, .0767, .0315, .0185], 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Scarlet-Violet-Pull-Rates/a7702fce-dd64-4a58-beb1-0f871c853215/'),
  scarletViolet('sv02', [.1372, .0664, .0770, .0317, .0176], 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Paldea-Evolved-Pull-Rates/1b7d3e70-9542-4a50-8692-1661e2316521/'),
  scarletViolet('sv03', [.1361, .0663, .0760, .0313, .0192], 'https://www.tcgplayer.com/content/article/Pok%C3%83%C2%A9mon-TCG-Obsidian-Flames-Pull-Rates/e2a66999-a7b5-4621-9765-c9a132e04bd2/'),
  scarletViolet('sv03.5', [.1328, .0644, .0850, .0311, .0194], 'https://www.tcgplayer.com/content/article/Pok%EF%BF%BDmon-TCG-Scarlet-Violet%EF%BF%BD151-Pull-Rates/b237df74-fbb0-40d0-9e13-d69ee6e804d9/', 0,
    ' 1,500+ pack sample. Rare evolution-line God Packs are not simulated.', .2483),
  scarletViolet('sv04', [.1557, .0664, .0770, .0211, .0122], 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Paradox-Rift-Pull-Rates/0b5fb648-38fc-4f61-a6af-57c2737b4a48/'),
  scarletViolet('sv05', [.1683, .0667, .0772, .0117, .0072], 'https://www.tcgplayer.com/content/article/robot/28c0ad22-00a4-428f-b22d-e7fee9ec50bc/', .05,
    ' ACE SPEC replaces the first reverse slot in 5% of packs.'),
  scarletViolet('sv06', [.1693, .0661, .0773, .0117, .0068], 'https://pokecompare.com/uk/pull-rates/twilight-masquerade', .0506,
    ' ACE SPEC replaces the first reverse slot.'),
  scarletViolet('sv07', [.1690, .0675, .0779, .0111, .0073], 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Stellar-Crown-Pull-Rates/2c0743dd-dbd0-4504-9ff8-be5a72dd04d1/', .0494,
    ' ACE SPEC replaces the first reverse slot.'),
  scarletViolet('sv08', [.1694, .0674, .0767, .0115, .0053], 'https://www.tcgplayer.com/content/article/Pok%EF%BF%BDmon-TCG-Surging-Sparks-Pull-Rates/6ccfb6ab-f26a-4ce8-bab5-5f91c85ec70e/', .0503,
    ' ACE SPEC replaces the first reverse slot.'),
  scarletViolet('sv09', [.2029, .0654, .0850, .0116, .0073], 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Journey-Together-Pull-Rates/1b9f379f-97cb-45cc-b6f6-a1a070a422cd/'),
  scarletViolet('sv10', [.1983, .0639, .0829, .0106, .0067], 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Destined-Rivals-Pull-Rates/43ba832e-44c9-45a4-ae2e-594df2defdda/'),
];
export const recipeFor = (setId: string) => pokemonRecipes.find(recipe => recipe.setId === setId);
