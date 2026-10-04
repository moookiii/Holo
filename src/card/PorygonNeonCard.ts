import type { CardDefinition } from './CardDefinition';

const root = '/cards/porygon2-neon';
const maps = { foil: `${root}/foil.png`, protection: `${root}/protection.png` };

export const porygonNeonCard: CardDefinition = {
  id: 'porygon2-neon', title: 'Porygon2 · Neon Cascade', franchise: 'Original',
  set: 'Atelier · Neon Cascade', number: '04', seed: 20000717,
  dimensions: { width: 8.8, height: 8.8, thickness: .032, cornerRadius: .025, bevel: .006 },
  front: `${root}/front.jpg`, back: `${root}/front.jpg`,
  profile: 'neon-cascade', backProfile: 'neon-cascade', maps, backMaps: maps,
  layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
  mapSettings: { embossStrength: 0, normalScale: 0 },
  stockSurface: { strength: 0, depth: 0 },
  source: {
    image: `${root}/front.jpg`, metadata: `${root}/source.json`,
    notes: 'Complete user-supplied square artwork, unchanged on both faces. User silhouette is the protection map: white blocks holo, black admits it. Neon Cascade is an original optical design, not a reconstruction of physical etched relief.',
  },
};
