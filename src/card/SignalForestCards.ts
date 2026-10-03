import type { CardDefinition, CardMapPaths } from './CardDefinition';

/** Two experimental art objects. The complete source sits inside the corner cut. */
export const signalForestCards: CardDefinition[] = [
  { id: 'signal-arbor', title: 'Signal Arbor', number: '02', seed: 260302 },
  { id: 'recursive-gate', title: 'Recursive Gate', number: '03', seed: 260303 },
].map(card => {
  const root = `/cards/${card.id}`;
  const fields = ['coverage', 'surface', 'foil', 'protection', 'height', 'normal', 'roughness', 'laminate', 'pattern', 'sparkle'] as const;
  const maps: CardMapPaths = Object.fromEntries(fields.map(name => [name, `${root}/${name}.png`]));
  return {
    ...card, franchise: 'Original', set: 'Atelier · Signal Forest',
    dimensions: { width: 4.8, height: 9.6, thickness: .042, cornerRadius: .075, bevel: .006 },
    front: `${root}/front.png`, back: `${root}/front.png`,
    profile: 'signal-forest-etched', backProfile: 'signal-forest-etched',
    maps, backMaps: maps,
    mapSettings: { roughnessMode: 'absolute', embossStrength: 0, normalScale: 1 },
    stockSurface: { strength: 0, depth: 0 },
    layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
    source: {
      image: `${root}/source.jpg`, metadata: `${root}/source.json`,
      notes: 'User artwork preserved pixel-for-pixel inside a protective margin, at its native 1:2 aspect. Both faces share the same print, fields and optical profile. Registered constant-section contour cuts and data-dot relief are artistic material designs, not a reconstruction of photographed relief. See docs/signal-forest.md.',
    },
  };
});
