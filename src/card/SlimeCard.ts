import type { CardDefinition } from './CardDefinition';
const root = '/cards/slime-emerald';
export const slimeCard: CardDefinition = {
  id: 'slime-emerald', title: 'Slime · Emerald Gel', franchise: 'Original',
  set: 'Atelier · Emerald Gel', number: '05', seed: 20261003,
  dimensions: { width: 8.8, height: 8.8, thickness: .032, cornerRadius: .025, bevel: .006 },
  front: `${root}/front.png`, back: `${root}/back.jpg`,
  profile: 'emerald-gel', backProfile: 'emerald-gel',
  maps: { foil: `${root}/front-foil.png` }, backMaps: { foil: `${root}/back-foil.png` },
  layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
  mapSettings: { embossStrength: 0, normalScale: 0 }, stockSurface: { strength: 0, depth: 0 },
  source: { image: `${root}/front.png`, metadata: `${root}/source.json`,
    notes: 'Original square front and distinct reverse retained unchanged. User white silhouettes admit foil on each slime; native-resolution PNG masks preserve soft edges. Original optical finish with no inferred etched relief.' },
};
