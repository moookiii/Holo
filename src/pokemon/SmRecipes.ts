import type { PokemonCard } from './types.ts';
import type { PokemonRecipe, SlotOutcome } from './recipes.ts';
import { svTcglCards } from './SvTcglCatalog.ts';
import { smWrappers } from './data/sm-wrappers.generated.ts';
import { smRates } from './data/sm-rates.generated.ts';

const cards = svTcglCards.filter(c => c.seriesId === 'sm');
const ordinary = ['Common', 'Uncommon', 'Rare', 'Holo Rare'];
const study = 'https://www.elitefourum.com/t/pull-rates-in-sun-moon-sword-shield-sets/25220/1';
const orderEvidence = 'https://www.reddit.com/r/PokemonTCG/comments/i7fvgg/could_someone_explain_the_card_trick/';

/** 2019 artwork starts at Team Up; Fairy remains a real ninth Energy type. */
export function smPackEnergy(setId: string): readonly PokemonCard[] {
  if (setId === 'gum') return [];
  const first = ['sm9', 'sm10', 'sm11', 'sm11-5', 'sm12'].includes(setId) ? 27 : 18;
  return cards.filter(c => c.setId === 'sm-energy' && Number(c.id.split('-').at(-1)) >= first && Number(c.id.split('-').at(-1)) < first + 9);
}
function branch(weight: number, pool: readonly PokemonCard[], variant: SlotOutcome['variant']): SlotOutcome {
  if (!pool.length || !pool.every(c => c.variants.includes(variant))) throw new Error('Incomplete exact Sun & Moon printing pool');
  return { weight, rarities: [...new Set(pool.map(c => c.rarity))], variant, cardIds: pool.map(c => c.id) };
}
function recipe(setId: keyof typeof smRates): PokemonRecipe {
  const own = cards.filter(c => c.setId === setId), ids = own.map(c => c.id);
  const r = smRates[setId].rates;
  const base = { id: `${setId}-english-retail`, version: '1', setId, era: 'sm',
    poolSetIds: [setId], requiredCardIds: ids, boosterIds: smWrappers[setId].map(b => b.id),
    energyCards: smPackEnergy(setId), sources: [study, orderEvidence, 'https://bulbapedia.bulbagarden.net/wiki/Booster_pack_(TCG)'],
    note: `10 expansion cards + 1 Basic Energy · English opening-study estimates (n=${smRates[setId].sampleSize}); not official odds. Natural sealed order: 5 commons, reverse/hit, rare, Energy, 3 uncommons. Uniform within category pools; independent slots; non-hit holo split estimated. Reverse Holo and Prism Star effects remain provisional.` };
  if (setId === 'gum') return { ...base,
    sources: [study, 'https://www.pokemon.com/us/pokemon-tcg/product-gallery/detective-pikachu-tin'],
    note: '4 holo cards: 3 commons then 1 rare/premium card; no Basic Energy or reverse slot. Premium frequency uses a small 240-pack English sample; cards uniform within each pool.',
    slots: [{ id: 'common', count: 3, unique: true, outcomes: [branch(1, own.filter(c => c.rarity === 'Common'), 'holo')] },
      { id: 'rare', count: 1, outcomes: [branch(1 - r.detectivePremium, own.filter(c => c.rarity === 'Rare'), 'holo'), branch(r.detectivePremium, own.filter(c => c.rarity === 'Holo Rare'), 'holo')] }] };
  const main = own.filter(c => !c.localId.startsWith('SV'));
  const vault = own.filter(c => c.localId.startsWith('SV'));
  const rare: SlotOutcome[] = [], replacements: SlotOutcome[] = [];
  const add = (list: SlotOutcome[], weight: number, pool: readonly PokemonCard[], variant: SlotOutcome['variant'] = 'holo') => {
    if (weight > 0) list.push(branch(weight, pool, variant));
  };
  const select = (pool: readonly PokemonCard[], rarities: readonly string[], category?: string) =>
    pool.filter(c => rarities.includes(c.rarity) && (!category || c.category === category));
  add(rare, r.gx, select(main, ['Holo Rare GX']));
  // Normalize separately reported category percentages to their rounded total.
  const ultraCategories = r.ultraPokemon + r.ultraTrainer;
  const ultraPokemon = ultraCategories ? r.ultra * r.ultraPokemon / ultraCategories : 0;
  const ultraTrainer = ultraCategories ? r.ultra * r.ultraTrainer / ultraCategories : 0;
  add(rare, ultraPokemon, select(main, ['Ultra Rare'], 'Pokemon'));
  const mainTrainers = select(main, ['Ultra Rare'], 'Trainer'), vaultTrainers = select(vault, ['Ultra Rare'], 'Trainer');
  const mainTrainerFraction = mainTrainers.length / (mainTrainers.length + vaultTrainers.length);
  add(rare, ultraTrainer * mainTrainerFraction, mainTrainers);
  add(replacements, ultraTrainer * (1 - mainTrainerFraction), vaultTrainers);
  add(rare, r.rainbow, select(main, ['Rainbow Rare']));
  if (setId === 'sm11-5') {
    add(replacements, r.secretPokemon, select(vault, ['Secret Rare'], 'Pokemon'));
    add(replacements, r.secretOther, select(vault, ['Secret Rare'], 'Trainer'));
    add(replacements, r.shiny, select(vault, ['Shiny Rare']));
    add(replacements, r.shinyGX, select(vault, ['Shiny Holo GX']));
    base.note += ' All SV1–SV94 cards replace the reverse position; main-set rare is independent. Full-art Trainer main/SV split is a pool-count estimate.';
  } else {
    if (setId !== 'sm12') add(rare, r.secretPokemon, select(main, ['Secret Rare', 'Secret Rare Energy'], 'Pokemon'));
    add(rare, r.secretOther, main.filter(c => ['Secret Rare', 'Secret Rare Energy'].includes(c.rarity) && c.category !== 'Pokemon'));
    add(rare, r.shiny, select(main, ['Shining Rare']));
  }
  add(replacements, r.prism, select(main, ['Prism Star']));
  add(replacements, r.character, select(main, ['Character Rare']));
  const foilGuaranteed = ['sm3-5', 'sm7-5'].includes(setId);
  const hits = rare.reduce((n, o) => n + o.weight, 0);
  const rareFoil = foilGuaranteed ? 1 : 1 / 3; // Explicit unmeasured residual assumption.
  add(rare, rareFoil - hits, select(main, ['Holo Rare']));
  if (!foilGuaranteed) add(rare, 1 - rareFoil, select(main, ['Rare']), 'normal');
  const foilEnergy = ['sm3-5', 'sm7-5', 'sm11-5'].includes(setId) ? .05 : 0;
  const special = replacements.reduce((n, o) => n + o.weight, 0);
  const reverse = [branch(1 - special - foilEnergy, main.filter(c => ordinary.includes(c.rarity) && c.variants.includes('reverse')), 'reverse'), ...replacements];
  if (foilEnergy) {
    reverse.push(branch(foilEnergy, base.energyCards, 'holo'));
    base.note += ' Foil Basic Energy may replace reverse; its 5% frequency is an explicit unmeasured estimate.';
  }
  if (foilGuaranteed) base.note += ' Rare position guarantees holo or better.';
  return { ...base, slots: [
    { id: 'common', count: 5, unique: true, outcomes: [branch(1, select(main, ['Common']), 'normal')] },
    { id: 'reverse-replacement', count: 1, pool: foilEnergy ? 'set-and-energy' : 'set', outcomes: reverse },
    { id: 'rare', count: 1, outcomes: rare },
    { id: 'energy', count: 1, pool: 'energy', outcomes: [branch(1, base.energyCards, 'normal')] },
    { id: 'uncommon', count: 3, unique: true, outcomes: [branch(1, select(main, ['Uncommon']), 'normal')] },
  ] };
}
export const smRecipes: readonly PokemonRecipe[] = (Object.keys(smRates) as (keyof typeof smRates)[])
  .filter(sid => cards.some(c => c.setId === sid)).map(recipe);
