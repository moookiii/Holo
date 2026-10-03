import type { CardDefinition, CardMapPaths } from './CardDefinition';

const root = '/cards/divided-heart';
const fields = ['coverage', 'surface', 'foil', 'protection', 'height', 'normal', 'roughness', 'laminate', 'pattern', 'sparkle', 'direction', 'metallic', 'secondaryFoil', 'stamp'] as const;
const maps: CardMapPaths = Object.fromEntries(fields.map(name => [name, `${root}/${name}.png?v=1`]));

export const dividedHeartCard: CardDefinition = {
  id: 'divided-heart', title: 'Divided Heart', franchise: 'Original',
  set: 'Atelier · Divided Heart', number: '06', seed: 26100306,
  dimensions: { width: 8.8, height: 8.8 * 716 / 736, thickness: .032, cornerRadius: .025, bevel: .006 },
  front: `${root}/front.png`, back: `${root}/front.png`,
  profile: 'divided-heart-etched', backProfile: 'divided-heart-etched', maps, backMaps: maps,
  layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
  mapSettings: { roughnessMode: 'absolute', embossStrength: 0, normalScale: 1 },
  stockSurface: { strength: 0, depth: 0 },
  source: { image: `${root}/front.png`, metadata: `${root}/source.json`,
    notes: 'Complete user photograph at its native aspect ratio, with photo-guided shirt, hair, heart, halo and wing etching. Smooth skin and golden hair are protected. Single-photo ridge spacing, hidden continuation and depth are estimates; photographed reflections remain in the source. Original uniform-grating holo on both faces.' },
};
