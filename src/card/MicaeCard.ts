import type { CardDefinition } from './CardDefinition';

const root = '/cards/micae';
export const micaeCard: CardDefinition = {
  id: 'micae', title: 'Micae · Sapphire Blue', franchise: 'Original',
  set: 'Atelier · Sapphire Blue', number: '05', seed: 20261003,
  dimensions: { width: 8.8, height: 8.8, thickness: .032, cornerRadius: .025, bevel: .006 },
  front: `${root}/front.png`, back: `${root}/front.png`, profile: 'sapphire-blue',
  maps: { foil: `${root}/foil.png`, protection: `${root}/protection.png` },
  layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
  mapSettings: { embossStrength: 0, normalScale: 0 },
  stockSurface: { strength: 0, depth: 0 },
  source: {
    image: `${root}/front.png`, metadata: `${root}/source.json`,
    notes: 'Unchanged user artwork. User cutout protects the figure; individual title glyphs are also protected. Sapphire Blue is an original optical finish, with no inferred etched relief. Reverse repeats the supplied art as plain print.',
  },
};
