import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import { tcglEtchedFinish } from '../materials/profiles/tcglEtchedFinish.ts';
import { tcgl151Surfaces } from './data/151-surfaces.generated.ts';
import { pokemon151Card, pokemon151Cards } from './Pokemon151Catalog.ts';
import { printVariantLabel, type PrintVariant } from './types.ts';

const surfaces = new Map(tcgl151Surfaces.map(surface => [`${surface.cardId}:${surface.variant}`, surface]));
export function pokemon151Profile(id: string, variant: PrintVariant): string {
  const card = pokemon151Card(id);
  if (!card.variants.includes(variant)) throw new Error(`Invalid 151 printing: ${id}:${variant}`);
  if (variant === 'normal') return 'print-only';
  const surface = surfaces.get(`${id}:${variant}`);
  if (!surface) throw new Error(`Missing exact TCGL 151 surface: ${id}:${variant}`);
  return surface.profile;
}
export function pokemon151Definition(id: string, variant: PrintVariant): CardDefinition {
  const card = pokemon151Card(id), profile = pokemon151Profile(id, variant);
  const surface = surfaces.get(`${id}:${variant}`);
  return {
    id: `pokemon:${id}:${variant}`, title: card.name, franchise: 'Pokémon', set: '151',
    number: `${card.localId}/165 · ${card.rarity} · ${printVariantLabel(variant)}`,
    dimensions: DIMENSIONS.standard, front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 2023151,
    pickerHidden: !surface, galleryVisible: variant === 'normal', pokemon: { ...card, variant, materialProfile: profile },
    layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
    ...(surface ? {
      maps: surface.maps,
      mapSettings: { normalScale: surface.textured ? 1 : 0, embossStrength: 0, roughnessMode: surface.textured ? 'absolute' : 'profile' },
      ...(surface.textured ? { profileOverrides: tcglEtchedFinish } : {}),
    } : {}),
    source: { image: card.front!, metadata: surface?.evidence ?? '/cards/pokemon/151/catalog.json',
      notes: 'Exact English TCGL 151 printing. Foil coverage and optional offline etched normal use this printing’s own sources.' },
  };
}
export const pokemon151PickerCards = () => pokemon151Cards.flatMap(card => card.variants
  .filter(variant => variant !== 'normal').map(variant => pokemon151Definition(card.id, variant)));
export const pokemon151GalleryCards = () => pokemon151Cards.filter(card => card.variants.includes('normal'))
  .map(card => pokemon151Definition(card.id, 'normal'));
