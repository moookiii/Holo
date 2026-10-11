import type { PokemonRecipe, SlotOutcome } from './recipes.ts';
import type { PokemonCard, PrintVariant } from './types.ts';
import { svTcglCards } from './SvTcglCatalog.ts';
import { xyWrappers } from './data/xy-wrappers.generated.ts';
import { xyRates, evolutionsUncommonSheet } from './data/xy-rates.generated.ts';

const cards = svTcglCards.filter(c => c.seriesId === 'xy');
const ordinary = ['Common','Uncommon','Rare','Holo Rare','Energy'];
function branch(weight: number, pool: readonly PokemonCard[], variant: PrintVariant): SlotOutcome {
  if (!(weight > 0) || !pool.length || pool.some(c => !c.variants.includes(variant))) throw new Error('Incomplete exact XY printing pool');
  return { weight, rarities: [...new Set(pool.map(c => c.rarity))], variant, cardIds: pool.map(c => c.id) };
}
export function xySupplementCards(setId: string): readonly PokemonCard[] {
  return setId === 'xy9-5' ? cards.filter(c => c.setId === 'xy9-5r') : [];
}
function recipe(setId: keyof typeof xyRates): PokemonRecipe {
  const own = cards.filter(c => c.setId === setId), rc = xySupplementCards(setId), rates = xyRates[setId];
  const select = (rarities: string[]) => own.filter(c => rarities.includes(c.rarity));
  const rare: SlotOutcome[] = [];
  const add = (weight: number, pool: readonly PokemonCard[], variant: PrintVariant) => { if (weight > 0) rare.push(branch(weight,pool,variant)); };
  const secrets = select(['Secret Rare']), exSecret = setId === 'xy2' || setId === 'xy3' ? secrets :
    setId === 'xy4' ? secrets.filter(c => c.name !== 'Dialga-EX') : [];
  const faSecret = secrets.filter(c => !exSecret.includes(c));
  add(rates.ex * (1-rates.exSecretFraction), select(['Holo Rare EX']), 'holo');
  add(rates.ex * rates.exSecretFraction, exSecret, 'holo');
  add(rates.fullArt * (1-rates.fullArtSecretFraction), select(['Ultra Rare']), 'holo');
  add(rates.fullArt * rates.fullArtSecretFraction, faSecret, 'holo');
  add(rates.holo, select(['Holo Rare']), 'holo');
  if (setId !== 'xy5-5') add(1-rates.holo-rates.ex-rates.fullArt, select(['Rare']), 'normal');
  const base = { id:`${setId}-english-retail`,version:'1',setId,era:'xy',
    boosterIds:xyWrappers[setId].map(b => b.id), poolSetIds:rc.length ? [setId,'xy9-5r'] : [setId],
    requiredCardIds:[...own,...rc].map(c => c.id), sources:[rates.source,
      'https://bulbapedia.bulbagarden.net/wiki/Booster_pack_(TCG)'],
    note:'Original English slot structure; primary observer estimates, not official odds. Uniform within category pools; independent rare/reverse slots. No extra modern Basic Energy, code insert, box guarantee or god packs. Finish-pending cards remain eligible.' };
  const reverse: SlotOutcome[] = [branch(1-rates.break, own.filter(c => ordinary.includes(c.rarity) && c.variants.includes('reverse')), 'reverse')];
  if (rates.break) reverse.push(branch(rates.break,select(['BREAK Rare']),'holo'));
  if (setId === 'xy5-5') return { ...base, note:base.note+' Double Crisis: 3 commons, 2 uncommons, reverse and guaranteed holo/full art; FA 1/9 rough estimate.',
    slots:[{id:'common',count:3,unique:true,outcomes:[branch(1,select(['Common']),'normal')]},
      {id:'reverse',count:1,outcomes:reverse},{id:'rare',count:1,outcomes:rare},
      {id:'uncommon',count:2,unique:true,outcomes:[branch(1,select(['Uncommon']),'normal')]}] };
  if (setId === 'xy9-5') return { ...base, note:base.note+' Generations: 8 core + 2 RC. Common/Energy share a sheet; RC premium sheet is 72 uncommon/28 ultra positions.',
    slots:[{id:'common',count:4,unique:true,outcomes:[branch(1,select(['Common','Energy']),'normal')]},
      {id:'reverse',count:1,outcomes:reverse},
      {id:'radiant-premium',count:1,outcomes:[branch(.72,rc.filter(c => c.rarity === 'Uncommon'),'holo'),branch(.28,rc.filter(c => ['Holo Rare EX','Ultra Rare'].includes(c.rarity)),'holo')]},
      {id:'rare',count:1,outcomes:rare},
      {id:'radiant-common',count:1,outcomes:[branch(1,rc.filter(c => c.rarity === 'Common'),'normal')]},
      {id:'uncommon',count:2,unique:true,outcomes:[branch(1,select(['Uncommon']),'normal')]}] };
  return { ...base, note:base.note+(rates.break ? ' BREAK replaces reverse.' : '')+(setId === 'xy12' ? ' Five nonfoil secrets are on the observed 121-position uncommon sheet; three consecutive positions retain its legal secret pairs.' : ''),
    slots:[{id:'common',count:5,unique:true,outcomes:[branch(1,select(['Common','Energy']),'normal')]},
      {id:'reverse',count:1,outcomes:reverse},{id:'rare',count:1,outcomes:rare},
      {id:'uncommon',count:3,...(setId === 'xy12' ? {sequence:evolutionsUncommonSheet} : {unique:true}),
        outcomes:[branch(1,select(setId === 'xy12' ? ['Uncommon','Secret Rare'] : ['Uncommon']),'normal')]}] };
}
export const xyRecipes: readonly PokemonRecipe[] = (Object.keys(xyRates) as (keyof typeof xyRates)[]).map(recipe);
