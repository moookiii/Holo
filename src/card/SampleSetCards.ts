import type { CardDefinition } from './CardDefinition.ts';
import { sampleSetCards } from '../pokemon/SampleSetCatalog.ts';

/** All ten exact English samples are ink on cardstock; none is foil. */
export const sampleSetDefinitions: CardDefinition[] = sampleSetCards.map(card => ({
  id: `pokemon:${card.id}:normal`, title: card.name, franchise: 'Pokémon', set: card.setName,
  number: `${card.localId}/093 · Non-holo · New York demo · 2002`,
  dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
  front: card.front!, back: '/cards/pokemon/sample-set/back-jp.png',
  backCrop: [27/925, 24/1280, 910/925, 1255/1280],
  profile: 'print-only', physicalProfile: 'pokemon', seed: 2002000 + Number(card.localId),
  // Full-front texture UVs retain the left and bottom dot-code strips.
  // These bounds describe the e-Card picture window; they do not crop the front.
  layout: { artwork: [.12, .12, .96, .50], innerFrame: [0, 0, 1, 1] },
  mapSettings: { embossStrength: 0 },
  pokemon: { ...card, variant: 'normal', materialProfile: 'print-only' },
  source: {
    image: `https://pokumon.com/card/sample-${card.name.toLowerCase()}-${card.localId}-093-new-york-pokemon-center-press-event-special-print/`,
    metadata: 'https://www.pokepedia.fr/Sample_Set',
    notes: 'Native, unmodified exact Sample front. M-prefix, Sample mark, /093 number and all e-Reader edges retained. Japanese new-design back. Modest scan resolution; stock response is an existing rendering estimate. See docs/sample-set.md and local sources.json.',
  },
}));

export function sampleSetDefinition(id: string, variant: string): CardDefinition {
  const card = sampleSetDefinitions.find(card => card.pokemon!.id === id);
  if (!card || variant !== 'normal') throw new Error(`Invalid Sample Set printing: ${id}:${variant}`);
  return { ...card, pokemon: { ...card.pokemon!, variants: ['normal'], types: [...card.pokemon!.types!], boosterIds: [] } };
}
