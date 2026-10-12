import type { PokemonRecipe, SlotOutcome } from './recipes.ts';
import type { PokemonCard, PrintVariant } from './types.ts';
import { svTcglCards } from './SvTcglCatalog.ts';
import { bwWrappers } from './data/bw-wrappers.generated.ts';
import { bwRates, bwCommonSheet, dragonVaultSheet } from './data/bw-rates.generated.ts';
import { bwTeamPlasma } from './data/bw-plasma.generated.ts';

const cards = svTcglCards.filter(c => c.seriesId === 'bw');
const ordinary = ['Common', 'Uncommon', 'Rare', 'Holo Rare', 'Energy'];
function branch(weight: number, pool: readonly PokemonCard[], variant: PrintVariant): SlotOutcome {
  if (!(weight > 0) || !pool.length || pool.some(c => !c.variants.includes(variant))) throw new Error('Incomplete exact BW printing pool');
  return { weight, rarities: [...new Set(pool.map(c => c.rarity))], variant, cardIds: pool.map(c => c.id) };
}
export function bwSupplementCards(setId: string): readonly PokemonCard[] {
  return setId === 'bw11' ? cards.filter(c => c.setId === 'bw11r') : [];
}
function recipe(setId: string): PokemonRecipe {
  const own = cards.filter(c => c.setId === setId), rc = bwSupplementCards(setId);
  const select = (rarities: string[]) => own.filter(c => rarities.includes(c.rarity));
  const base = { id: `${setId}-english-retail`, version: '1', setId, era: 'bw',
    boosterIds: bwWrappers[setId].map(b => b.id), poolSetIds: rc.length ? [setId, 'bw11r'] : [setId],
    requiredCardIds: [...own, ...rc].map(c => c.id),
    sources: ['https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762',
      'https://bulbapedia.bulbagarden.net/wiki/Booster_pack_(TCG)'],
    note: 'English retail packs · odds follow historical opening studies and are estimates, not manufacturer guarantees.' };
  if (setId === 'bw6-5') return { ...base,
    sources: [...base.sources, 'https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762/107',
      'https://cdn.pidgi.net/images/5/57/Dragon_Vault_sell_sheet_EN.pdf'],
    note: 'Five holofoil cards per booster, with a chance of Kyurem 21/20. Collation follows an observed printing sheet; exact manufacturer odds are unknown.',
    slots: [{ id: 'holo-sheet', count: 5, sequence: dragonVaultSheet, outcomes: [branch(1, own, 'holo')] }] };
  const rates = bwRates[setId as keyof typeof bwRates];
  const rare: SlotOutcome[] = [];
  const add = (list: SlotOutcome[], weight: number, pool: readonly PokemonCard[], variant: PrintVariant) => {
    if (weight > 0) list.push(branch(weight, pool, variant));
  };
  add(rare, rates.ex, select(['Holo Rare EX']), 'holo');
  add(rare, rates.fullArt, select(['Ultra Rare']), 'holo');
  add(rare, rates.secret, select(['Secret Rare']), 'holo');
  const reverse = [branch(setId === 'bw11' ? .5 : 1-rates.ace,
    own.filter(c => ordinary.includes(c.rarity) && c.variants.includes('reverse')), 'reverse')];
  add(reverse, rates.ace, select(['ACE SPEC']), 'holo');
  if (setId === 'bw11') {
    add(reverse, .5, select(['Holo Rare']), 'holo');
    add(rare, 1-rates.ex-rates.secret, select(['Rare']), 'normal');
    const rcCommon = rc.filter(c => c.rarity === 'Common');
    const rcUncommon = rc.filter(c => c.rarity === 'Uncommon');
    const rcUltra = rc.filter(c => ['Holo Rare EX', 'Ultra Rare'].includes(c.rarity));
    // RC uncommons are exact TCGL holo printings even when the source finish
    // enum says Reverse. Physical specialty glitter remains print-only.
    return { ...base, sources: [...base.sources, rates.source],
      note: 'Ten cards: four commons, two uncommons, a reverse or holo, a rare or better, and two Radiant Collection cards. Historical opening-study odds are estimates. RC glitter and entirely gold finishes are pending.',
      slots: [{ id: 'common', count: 4, unique: true, outcomes: [branch(1, select(['Common']), 'normal')] },
        { id: 'reverse-or-holo', count: 1, outcomes: reverse },
        { id: 'radiant-premium', count: 1, outcomes: [branch(.7, rcUncommon, 'holo'), branch(.3, rcUltra, 'holo')] },
        { id: 'rare', count: 1, outcomes: rare },
        { id: 'radiant-common', count: 1, outcomes: [branch(1, rcCommon, 'normal')] },
        { id: 'uncommon', count: 2, unique: true, outcomes: [branch(1, select(['Uncommon']), 'normal')] }] };
  }
  const plasma = (c: PokemonCard) => bwTeamPlasma[setId]?.includes(c.id) ?? false;
  const split = (list: SlotOutcome[], weight: number, pool: PokemonCard[], variant: PrintVariant, fraction: number) => {
    add(list, weight*(1-fraction), pool.filter(c => !plasma(c)), variant);
    add(list, weight*fraction, pool.filter(plasma), variant);
  };
  const rareWeight = 1-rates.holo-rates.ex-rates.fullArt-rates.secret;
  if (bwTeamPlasma[setId]) {
    const holoFraction = setId === 'bw8' ? 5/8 : setId === 'bw9' ? 28/50 : 10/52;
    split(rare, rates.holo, select(['Holo Rare']), 'holo', holoFraction);
    split(rare, rareWeight, select(['Rare']), 'normal', setId === 'bw10' ? 1/3 : .5);
  } else {
    add(rare, rates.holo, select(['Holo Rare']), 'holo');
    add(rare, rareWeight, select(['Rare']), 'normal');
  }
  return { ...base, sources: [...base.sources, rates.source],
    note: 'Ten cards: five commons, three uncommons, one reverse' + (rates.ace ? ' or ACE SPEC' : '') +
      ', and one rare or better. Odds follow historical opening studies and are estimates.' +
      (setId === 'bw1' ? ' Basic Energy may appear among the commons; reverse Energy printings are unavailable.' : ''),
    slots: [{ id: 'common', count: 5, ...(setId === 'bw1' ? { sequence: bwCommonSheet } : { unique: true }),
      outcomes: [branch(1, select(['Common', 'Energy']), 'normal')] },
      { id: 'reverse-or-ace-spec', count: 1, outcomes: reverse }, { id: 'rare', count: 1, outcomes: rare },
      ...(bwTeamPlasma[setId] ? [
        { id: 'plasma-uncommon', count: 1, outcomes: [branch(1, select(['Uncommon']).filter(plasma), 'normal')] },
        { id: 'ordinary-uncommon', count: 2, unique: true, outcomes: [branch(1, select(['Uncommon']).filter(c => !plasma(c)), 'normal')] },
      ] : [{ id: 'uncommon', count: 3, unique: true, outcomes: [branch(1, select(['Uncommon']), 'normal')] }]) ] };
}
export const bwRecipes: readonly PokemonRecipe[] = Object.keys(bwWrappers).map(recipe);
