import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import { basicEnergyCards } from './energy.ts';

/** Exact SVE reverse resources used only in the Prismatic pack context. */
export function prismaticEnergyDefinition(id: string): CardDefinition {
  const card=basicEnergyCards.find(card=>card.id===id);
  if (!card) throw new Error(`Unknown Prismatic Basic Energy: ${id}`);
  const number=Number(card.localId), prefix=`/cards/pokemon/prismatic-evolutions/tcgl/energy-${number}-reverse-`;
  return { id:`pokemon:${id}:reverse:sv08.5`,title:card.name,franchise:'Pokémon',set:'Prismatic Evolutions',
    number:`SVE ${card.localId} · Basic Energy · Reverse holo`,dimensions:DIMENSIONS.standard,
    front:card.front!,back:'/cards/pokemon/back.jpg',profile:'pokemon-cosmos',seed:2025085,
    maps:{foil:prefix+'foil.png',protection:prefix+'protection.png'},mapSettings:{normalScale:0,embossStrength:0},
    pokemon:{...card,variant:'reverse',materialProfile:'pokemon-cosmos',variants:['normal','reverse']},
    source:{image:card.front!,metadata:prefix+'evidence.json',notes:'Exact TCGL SVE reverse foil mask. Smooth unetched Cosmos surface.'},
  };
}
export const prismaticEnergyPickerCards=()=>basicEnergyCards.map(card=>prismaticEnergyDefinition(card.id));
