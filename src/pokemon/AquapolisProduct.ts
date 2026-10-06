import type { PokemonRecipe } from './recipes.ts';
import { aquapolisRecords } from './data/aquapolis.generated.ts';

export const aquapolisWrapper = {
  back:'ecard2-back.jpg',
  designs:['arcanine','entei','scizor','tyranitar'].map(id=>({id,name:id[0].toUpperCase()+id.slice(1),front:`ecard2-${id}.png`})),
};
/** Crystal odds have no verified historical value; never fabricate a probability. */
export const aquapolisRecipe: PokemonRecipe = {
  id:'ecard2-english-retail',version:'1',setId:'ecard2',era:'ecard',
  boosterIds:aquapolisWrapper.designs.map(d=>d.id),requiredCardIds:aquapolisRecords.map(c=>c.id),
  sources:['https://www.pojo.com/chrisbo/11-10-02-WotcChat.html',
    'https://www.psacard.com/articles/articleview/9721/psa-set-registry-collecting-2003-poke-mon-aquapolis-its-appeal-crystal-clear'],
  note:'2003 Aquapolis · 9 cards · 5 commons + 2 uncommons + 1 normal rare + 1 reverse. A regular holo replaces one common, approximately 1:3. No Basic Energy slot; Special Energy uses its printed rarity. Crystals are gallery-only until pull odds are verified. Eligible prints are selected uniformly; factory sheets are undocumented.',
  slots:[
    {id:'common',count:4,unique:true,outcomes:[{weight:1,rarities:['Common'],variant:'normal'}]},
    {id:'common-or-holo',count:1,outcomes:[
      {weight:2/3,rarities:['Common'],variant:'normal'},
      {weight:1/3,rarities:['Holo Rare'],variant:'holo'},
    ]},
    {id:'uncommon',count:2,unique:true,outcomes:[{weight:1,rarities:['Uncommon'],variant:'normal'}]},
    {id:'rare',count:1,outcomes:[{weight:1,rarities:['Rare'],variant:'normal'}]},
    {id:'reverse',count:1,outcomes:[{weight:1,rarities:['Common','Uncommon','Rare'],variant:'reverse'}]},
  ],
};
