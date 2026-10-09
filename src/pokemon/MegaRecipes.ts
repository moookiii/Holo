import type { PokemonRecipe, SlotOutcome } from './recipes.ts';
import { svTcglCards } from './SvTcglCatalog.ts';

const sources: Record<string, string> = {
  me01: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Mega-Evolution-Pull-Rates/40cbeedc-21ce-473b-aef1-74e3969d9f91/',
  me02: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Phantasmal-Flames-Pull-Rates/9abae60d-b7fb-448f-874e-176f78d6a6ca/',
  'me02.5': 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Ascended-Heroes-Pull-Rates/60143d94-88a7-42ce-8e73-babd7b3fabd6/',
  me03: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Perfect-Order-Pull-Rates/73148119-ebcb-40b7-84b6-52b3a6d0c631/',
  me04: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Chaos-Rising-Pull-Rates/304e8bfc-175a-4d31-93fe-5bb1be11e5d2/',
  me05: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Pitch-Black-Pull-Rates/069a5fda-2d1f-44a1-97de-b6dcdc5abfb8/',
};
// Measured per-pack percentages, not factory probabilities or era averages.
// Ascended uses the article's summary 4.81% Ultra rate; its detail table has a
// copied 20.77% typo inconsistent with both the summary and 1-in-21 figure.
const rates: Record<string, readonly number[]> = {
  me01: [.2091,.0823,.1089,.0099,.0008,0],
  me02: [.2077,.0806,.1097,.0125,.0008,0],
  'me02.5': [.2037,.0481,.1125,.0144,.0019,.0347],
  me03: [.2097,.0854,.1120,.0123,.0006,0],
  me04: [.2030,.0829,.1066,.0121,.0010,0],
  me05: [.2102,.0830,.1101,.0125,.0009,0],
};
const ordinary = ['Common','Uncommon','Rare'];
const hit = (weight: number, rarities: readonly string[], variant: SlotOutcome['variant']): SlotOutcome => ({weight,rarities,variant});
export const megaPackEnergy = svTcglCards.filter(card => card.setId === 'mee' && Number(card.localId) <= 8 && card.variants.includes('normal'));
export const megaRecipes: readonly PokemonRecipe[] = Object.entries(rates)
  .filter(([setId]) => svTcglCards.some(card => card.setId === setId && card.rarity === 'Special Illustration Rare'))
  .map(([setId, [double,ultra,illustration,special,hyper,attack]]) => ({
    id: `${setId}-english-retail`, version: '1', setId, era: 'me',
    requiredCardIds: svTcglCards.filter(card => card.setId === setId).map(card => card.id), energyCards: megaPackEnergy,
    sources: [sources[setId], 'https://support.pokemon.com/hc/en-us/articles/360000981613-What-can-I-expect-in-a-Pok%C3%A9mon-Trading-Card-Game-booster-pack',
      'https://folio.fyi/blog/are-gold-pokemon-cards-real',
      ...(setId === 'me02.5' ? ['https://www.pokebeach.com/2026/01/ascended-heroes-set-guide-full-set-list-god-packs-reverse-holos-product-lineup-and-more'] : [])],
    note: '10 expansion cards + 1 exact Basic Energy. Physical code insert excluded from game-card simulation. Measured pull-rate estimates; uniform within pools and independent replacements. Factory print-sheet correlations unknown.' +
      (setId === 'me02.5' ? ' Energy/plain reverse first, assigned special reverse second (plain Trainers/Energy remain eligible). God-pack frequency unknown and excluded from random odds. TCGL ph2 motif discrepancies recorded in source evidence.' : ''),
    slots: [
      {id:'common',count:4,unique:true,outcomes:[hit(1,['Common'],'normal')]},
      {id:'uncommon',count:3,unique:true,outcomes:[hit(1,['Uncommon'],'normal')]},
      {id:'reverse',count:1,outcomes:[hit(1,ordinary,'reverse')]},
      {id:'reverse-replacement',count:1,outcomes:[
        // The plain Trainer/Energy and assigned Pokemon ph2 printings share
        // this slot; source eligibility is exact, not a random pattern roll.
        ...(setId === 'me02.5' ? [
          {...hit(1-illustration-special-hyper,ordinary,'special-reverse'), fallbackVariant:'reverse' as const},
        ] : [hit(1-illustration-special-hyper,ordinary,'reverse')]),
        hit(illustration,['Illustration Rare'],'holo'), hit(special,['Special Illustration Rare'],'holo'), hit(hyper,['Mega Hyper Rare'],'holo'),
      ]},
      {id:'rare',count:1,outcomes:[hit(1-double-ultra-attack,['Rare'],'holo'),hit(double,['Double Rare'],'holo'),hit(ultra,['Ultra Rare'],'holo'),
        ...(attack ? [hit(attack,['Mega Attack Rare'],'holo')] : [])]},
      {id:'energy',count:1,pool:'energy',outcomes:[hit(1,['Energy'],'normal')]},
    ],
  }));

/** The published configuration is known; its occurrence rate and factory
 * card correlations are not. Keep it an explicit opening, never a random roll. */
export const megaGodConfigurations: readonly PokemonRecipe[] = [{
  id:'me02.5-english-god-configuration',version:'1',setId:'me02.5',era:'me',
  configurationLabel:'God pack · verified configuration',
  sources:[sources['me02.5'],'https://www.pokebeach.com/2026/01/ascended-heroes-set-guide-full-set-list-god-packs-reverse-holos-product-lineup-and-more'],
  note:'Confirmed configuration: 3 Mega Attack Rares + 7 Special Illustration Rares, plus Basic Energy. Occurrence frequency unknown; excluded from random pack odds. Cards sampled uniformly within each rarity; factory combinations unknown.',
  requiredCardIds:svTcglCards.filter(card=>card.setId==='me02.5').map(card=>card.id),energyCards:megaPackEnergy,
  slots:[{id:'mega-attack',count:3,unique:true,outcomes:[hit(1,['Mega Attack Rare'],'holo')]},
    {id:'special-illustration',count:7,unique:true,outcomes:[hit(1,['Special Illustration Rare'],'holo')]},
    {id:'energy',count:1,pool:'energy',outcomes:[hit(1,['Energy'],'normal')]}],
}];
