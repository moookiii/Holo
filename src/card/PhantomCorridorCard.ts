import type { CardDefinition, CardMapPaths } from './CardDefinition';
const root = '/cards/gengar-phantom-corridor';
const fields = ['coverage', 'surface', 'foil', 'protection', 'height', 'normal', 'roughness', 'laminate', 'pattern', 'sparkle', 'direction', 'metallic', 'secondaryFoil'] as const;
const maps: CardMapPaths = Object.fromEntries(fields.map(name => [name, `${root}/${name}.png`]));
export const phantomCorridorCard: CardDefinition = {
  id: 'gengar-phantom-corridor', title: 'Gengar · Phantom Corridor', franchise: 'Original',
  set: 'Atelier · Phantom Corridor', number: '05', seed: 2601003,
  dimensions: { width: 4.8, height: 9.6, thickness: .032, cornerRadius: .035, bevel: .006 },
  front: `${root}/front.jpg`, back: `${root}/front.jpg`,
  profile: 'phantom-corridor', backProfile: 'phantom-corridor', maps, backMaps: maps,
  layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
  mapSettings: { roughnessMode: 'absolute', embossStrength: 0, normalScale: 1 },
  stockSurface: { strength: 0, depth: 0 },
  source: { image: `${root}/front.jpg`, metadata: `${root}/source.json`,
    notes: 'Complete native 1:2 user artwork with original perspective-flute holo on both faces. Protected Gengar silhouette. Uniform grating follows authored normals; spacing and depth are artistic choices.' },
};
