import type { CardDefinition } from './CardDefinition.ts';
import { aquapolisCards } from '../pokemon/AquapolisCatalog.ts';

const base='/cards/pokemon/aquapolis/maps';
/** H cards reuse the established Cosmos optics with per-master PNG placement. */
export const aquapolisDefinitions: CardDefinition[] = aquapolisCards.flatMap(card=>card.variants.map(variant=>{
  const reverse=variant==='reverse', holo=variant==='holo';
  const cosmos=holo&&card.localId.startsWith('H');
  const profile=reverse?'pokemon-e-reader':cosmos?'pokemon-base-set-2-cosmos':'print-only';
  return {
    id:`pokemon:${card.id}:${variant}`,title:card.name,franchise:'Pokémon',set:'Aquapolis',
    number:`${card.localId}/${card.localId.startsWith('H')?'H32':'147'} · ${holo?cosmos?'Holo':'Holo · foil pending':reverse?'Reverse holo':'Non-holo'}`,
    dimensions:{width:6.3,height:8.8,thickness:.032,cornerRadius:.3,bevel:.007},physicalProfile:'pokemon',
    front:card.front!,back:'/cards/pokemon/back.jpg',profile,
    seed:2003000+parseInt(card.localId.replace('H','')),
    ...(cosmos?{maps:{motif:`${base}/${card.localId}-cosmos.png`,foil:`${base}/${card.localId}-holo-window.png`,protection:`${base}/${card.localId}-holo-protection.png`},
      mapSettings:{embossStrength:0},substrate:{color:[0,0,0] as [number,number,number],printRetention:1}}
      :reverse?{coverageMode:'reverse' as const,maps:{reverseFoil:`${base}/${card.localId}-reverse.png`}}:{}),
    layout:{artwork:card.category==='Pokemon'?[58/600,98/825,580/600,403/825]:card.category==='Trainer'?[58/600,130/825,580/600,443/825]:[58/600,100/825,580/600,480/825],innerFrame:[0,0,1,1]},
    pokemon:{...card,variant,materialProfile:profile},
    source:{image:card.front!,metadata:`https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes:cosmos?'Unchanged exact English H-card master, supplied SAM protection and registered full-card Cosmos PNG motifs. Existing Base Set 2 optics; no etched relief. See docs/aquapolis-cosmos.md.'
        :holo?'Exact English Crystal master. Crystal foil authoring remains pending. See docs/aquapolis.md.'
        :'Exact English full-card master; existing e-reader reverse material and card-specific PNG coverage. See source and mask evidence.'},
  } satisfies CardDefinition;
}));
