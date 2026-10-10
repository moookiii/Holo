import type { PokemonRecipe, SlotOutcome } from './recipes.ts';
import { svTcglCards } from './SvTcglCatalog.ts';
import { swshWrappers } from './data/swsh-wrappers.generated.ts';
import { swshPackEnergy } from './SwshEnergy.ts';

const cards = svTcglCards.filter(c => c.seriesId === 'swsh');
const supplements: Record<string,string> = { swsh9:'swsh9a',swsh10:'swsh10a',swsh11:'swsh11a',swsh12:'swsh12a','swsh12-5':'swsh12-5a','swsh7-5':'swsh7-5r' };
const slugs: Record<string,string> = { swsh1:'sword-and-shield',swsh2:'rebel-clash',swsh3:'darkness-ablaze','swsh3-5':'champions-path',swsh4:'vivid-voltage',swsh5:'battle-styles',swsh6:'chilling-reign',swsh7:'evolving-skies',swsh8:'fusion-strike',swsh9:'brilliant-stars',swsh10:'astral-radiance','swsh10-5':'pokemon-go',swsh11:'lost-origin',swsh12:'silver-tempest','swsh12-5':'crown-zenith' };
// Published sample estimates reproduced by Pokecompare, credited to TCGplayer.
// V, VMAX/VSTAR, full/alt art combined, rainbow, gold. These are NOT factory odds.
const rates: Record<string,readonly number[]> = {
  swsh1:[.142,.022,.0374,.0123,.0091],swsh2:[.1265,.034,.0376,.015,.0095],
  swsh3:[.1258,.0385,.0385,.0119,.0087],'swsh3-5':[.1573,.0355,.0539,.0157,.0132],
  swsh4:[.05,.0417,.0323,.0105,.006],swsh5:[.125,.0345,.0401,.0112,.0095],
  swsh6:[.1111,.0345,.0461,.0139,.0161],swsh7:[.1056,.056,.0418,.0084,.0091],
  swsh9:[.1494,.0378,.0207,.0196,.0109],swsh10:[.1277,.0347,.0395,.0128,.0076],
  swsh11:[.1163,.0442,.039,.0128,.0076],swsh12:[.1155,.0372,.0371,.0126,.0094],
  'swsh12-5':[.1235,.053,.0095,0,.0075],
};
const ordinary=['Common','Uncommon','Rare','Holo Rare'];
const high=['Holo Rare VMAX','Holo Rare VSTAR'];
const gold=['Secret Rare','Secret Rare Energy'];
const tg=['Character Rare'];
const tgPremium=['Character Holo V','Character Ultra Rare','Character Secret Rare'];
function outcome(weight:number,rarities:readonly string[],variant:SlotOutcome['variant'], ids?:readonly string[]):SlotOutcome {
  return {weight,rarities,variant,...(ids?{cardIds:ids}:{})};
}
function normalized(values:SlotOutcome[]):SlotOutcome[] {
  const sum=values.reduce((n,v)=>n+v.weight,0);return values.map(v=>({...v,weight:v.weight/sum}));
}
function recipe(setId:string):PokemonRecipe {
  const poolSetIds=[setId,...(supplements[setId]?[supplements[setId]]:[])];
  const pool=cards.filter(c=>poolSetIds.includes(c.setId));
  const own=pool.filter(c=>c.setId===setId);
  const ownIds=own.map(c=>c.id);
  const base={id:`${setId}-english-retail`,version:'2',setId,era:'swsh',poolSetIds,requiredCardIds:pool.map(c=>c.id),boosterIds:swshWrappers[setId].map(b=>b.id),energyCards:swshPackEnergy(setId),
    sources:[`https://pokecompare.com/pull-rates/${slugs[setId] ?? 'shining-fates'}`,'https://bulbapedia.bulbagarden.net/wiki/Booster_pack_(TCG)'],
    note:'10 expansion cards + 1 Basic Energy. Sample-based estimates where available; uniform within pools (including Energy types), independent slots, factory collation unknown.'};
  if(setId==='swsh7-5') {
    const regular=own.filter(c=>['Rare','Holo Rare'].includes(c.rarity)).map(c=>c.id);
    const special=own.filter(c=>!regular.includes(c.id)).map(c=>c.id);
    const allRarities=[...new Set(own.map(c=>c.rarity))];
    return {...base,sources:['https://www.pokemon.com/us/pokemon-tcg/product-gallery/celebrations-ultra-premium-collection','https://www.reddit.com/r/PokemonTCG/comments/qrm5cp/'],
      note:'4 foil cards · no Energy. Classic replaces slot 3; main-set special foil in slot 4. Classic 40% is a 5,000-pack community estimate; slot-4 frequencies use uniform eligible cards, not published factory odds.',
      slots:[{id:'regular',count:2,unique:true,outcomes:[outcome(1,allRarities,'holo',regular)]},
        {id:'classic-replacement',count:1,outcomes:[outcome(.6,allRarities,'holo',regular),outcome(.4,['Classic Collection'],'holo')]},
        {id:'rare',count:1,outcomes:[outcome(1,allRarities,'holo',[...regular,...special])]}]};
  }
  let reverse:SlotOutcome[]=[outcome(1,ordinary,'reverse',ownIds)];
  let rare:SlotOutcome[]=[];
  const has=(o:SlotOutcome)=>pool.some(c=>o.rarities.includes(c.rarity)&&c.variants.includes(o.variant)&&(!o.cardIds||o.cardIds.includes(c.id)));
  if(setId==='swsh4-5') {
    // Original collector's tracked sample: 502 packs (post initially says 500).
    base.sources=['https://www.reddit.com/r/PokemonTCG/comments/ln53pr/compiling_shining_fates_pull_data_and_results/'];
    reverse=normalized([outcome(.5857,ordinary,'reverse'),outcome(.253,['Shiny Rare'],'holo'),outcome(.0498,['Shiny Holo V'],'holo'),outcome(.0418,['Shiny Holo VMAX'],'holo'),outcome(.0657,['Amazing Rare'],'holo'),outcome(.004,gold,'holo')]);
    rare=normalized([outcome(.5797,['Rare'],'normal'),outcome(.1753,['Holo Rare'],'holo'),outcome(.1155,['Holo Rare V'],'holo'),outcome(.0657,high,'holo'),outcome(.0458,['Ultra Rare'],'holo'),outcome(.0179,['Rainbow Rare'],'holo')]);
  } else {
    const r=rates[setId];
    if(r) rare=[outcome(r[0],['Holo Rare V'],'holo',ownIds),outcome(r[1],high,'holo',ownIds),outcome(r[2],['Ultra Rare'],'holo',ownIds),outcome(r[3],['Rainbow Rare'],'holo',ownIds),outcome(r[4],gold,'holo',ownIds)].filter(o=>o.weight>0&&has(o));
    // No invented exact holo/non-holo odds: distribute the residual uniformly
    // across eligible numbered rare cards. Explicitly a simulation assumption.
    const residual=1-rare.reduce((n,o)=>n+o.weight,0);
    const low=own.filter(c=>['Rare','Holo Rare'].includes(c.rarity));
    if(!r) {
      // Missing marginal evidence: uniform eligible rare pool is provisional.
      const eligible=own.filter(c=>!['Common','Uncommon','Radiant Rare','Amazing Rare','Ultra Rare Energy'].includes(c.rarity));
      const byVariant=[['normal',eligible.filter(c=>c.variants.includes('normal'))],['holo',eligible.filter(c=>!c.variants.includes('normal')&&c.variants.includes('holo'))]] as const;
      rare=byVariant.filter(([,cs])=>cs.length).map(([v,cs])=>outcome(cs.length/eligible.length,[...new Set(cs.map(c=>c.rarity))],v,cs.map(c=>c.id)));
      base.note+=' Rare frequencies provisional: uniform eligible checklist; no claimed measured odds.';
    } else {
      for(const variant of ['normal','holo'] as const) {
        const eligible=low.filter(c=>c.variants.includes(variant));
        if(eligible.length)rare.push(outcome(residual*eligible.length/low.length,['Rare','Holo Rare'],variant,eligible.map(c=>c.id)));
      }
      base.note+=' Holo/non-holo residual is uniform by eligible card, not measured odds.';
    }
    const special:SlotOutcome[]=[];
    if(setId==='swsh12-5') {
      // Radiant and numbered textured Energy belong to the rare position in
      // Crown Zenith, allowing a simultaneous Galarian Gallery hit.
      const extras=own.filter(c=>['Radiant Rare','Ultra Rare Energy'].includes(c.rarity));
      const remaining=rare.filter(o=>o.rarities.includes('Rare')||o.rarities.includes('Holo Rare'));
      const budget=remaining.reduce((n,o)=>n+o.weight,0);
      const lowCount=own.filter(c=>['Rare','Holo Rare'].includes(c.rarity)).length;
      const fraction=extras.length/(lowCount+extras.length);
      rare=rare.map(o=>remaining.includes(o)?{...o,weight:o.weight*(1-fraction)}:o);
      rare.push(outcome(budget*fraction,['Radiant Rare','Ultra Rare Energy'],'holo',extras.map(c=>c.id)));
      base.note+=' Crown Zenith numbered Energy/Radiant rare frequency uses the residual uniform-card approximation.';
    }
    if(supplements[setId]&&setId!=='swsh12-5') {
      const [a,b]=({swsh9:[.125,.0556],swsh10:[.0848,.041],swsh11:[.1231,.0317],swsh12:[.1223,.0308]} as Record<string,number[]>)[setId];
      special.push(outcome(a,tg,'holo'),outcome(b,tgPremium,'holo'));
    }
    if(setId==='swsh12-5')special.push(outcome(.352,['Galarian Gallery Holo Rare','Galarian Gallery Ultra Rare','Galarian Gallery Secret Rare'],'holo'));
    if(['swsh11','swsh12'].includes(setId))special.push(outcome(setId==='swsh11'?.0501:.0455,['Radiant Rare'],'holo'));
    if(own.some(c=>c.rarity==='Amazing Rare')||setId==='swsh10'||setId==='swsh10-5') {
      // Frequency unavailable; use explicit pool-size approximation for this
      // replacement only, rather than labeling a made-up rate as measured.
      const rarity=setId==='swsh4'?'Amazing Rare':'Radiant Rare';
      const count=own.filter(c=>c.rarity===rarity).length;
      special.push(outcome(count/own.filter(c=>c.variants.includes('reverse')||c.rarity===rarity).length,[rarity],'holo',ownIds));
      base.note+=' Amazing/Radiant replacement frequency is a uniform-pool approximation.';
    }
    reverse=[outcome(1-special.reduce((n,o)=>n+o.weight,0),ordinary,'reverse',ownIds),...special];
  }
  return {...base,slots:[{id:'common',count:5,unique:true,outcomes:[outcome(1,['Common'],'normal',ownIds)]},{id:'uncommon',count:3,unique:true,outcomes:[outcome(1,['Uncommon'],'normal',ownIds)]},{id:'reverse-replacement',count:1,outcomes:reverse},{id:'rare',count:1,outcomes:rare},{id:'energy',count:1,pool:'energy',outcomes:[outcome(1,['Energy'],'normal')]}]};
}
export const swshRecipes: readonly PokemonRecipe[] = Object.keys(swshWrappers).map(recipe);
export function swshSupplementCards(setId:string) { return cards.filter(c=>c.setId===supplements[setId]); }
