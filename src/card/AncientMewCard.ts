import type { CardDefinition } from './CardDefinition.ts';

export const ancientMewCard: CardDefinition = {
  id:'ancient-mew', title:'Ancient Mew', franchise:'Pokémon', set:'Movie promotional card', number:'2000 · Ancient Mew',
  dimensions:{width:6.3,height:8.8,thickness:.032,cornerRadius:.3,bevel:.007},
  front:'/cards/ancient-mew/front.jpeg',back:'/cards/ancient-mew/back.jpeg',
  profile:'pokemon-ancient-mew',seed:2000,
  layout:{artwork:[0,0,1,1],innerFrame:[0,0,1,1]},
  maps:{foil:'/cards/ancient-mew/foil.png',protection:'/cards/ancient-mew/protection.png',motif:'/cards/ancient-mew/flakes.png'},
  mapSettings:{embossStrength:0}, substrate:{color:[.012,.006,.02],printRetention:.26},
  source:{image:'/cards/ancient-mew/front.jpeg',metadata:'/cards/ancient-mew/sources.json',
    notes:'Unchanged user front and reverse. Full-front registered irregular foil silhouettes, separate gold-print protection, and dedicated optics tuned from the supplied tilt video. No etched relief. See docs/ancient-mew.md.'},
};
