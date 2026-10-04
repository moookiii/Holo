import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import { tcglEtchedFinish } from '../materials/profiles/tcglEtchedFinish.ts';
import { tcglSvSurfaces } from './data/sv-tcgl-surfaces.generated.ts';
import { svTcglCard, svTcglCards, svTcglCollectorNumber } from './SvTcglCatalog.ts';
import { printVariantLabel, type PrintVariant } from './types.ts';

const surfaces = new Map(tcglSvSurfaces.map(surface => [`${surface.cardId}:${surface.variant}`, surface]));
export function svTcglProfile(id: string, variant: PrintVariant): string {
  const card = svTcglCard(id);
  if (!card.variants.includes(variant)) throw new Error(`Invalid TCGL printing: ${id}:${variant}`);
  if (variant === 'normal') return 'print-only';
  const surface = surfaces.get(`${id}:${variant}`);
  if (!surface) throw new Error(`Missing exact TCGL surface: ${id}:${variant}`);
  return surface.profile;
}
export function svTcglDefinition(id: string, variant: PrintVariant): CardDefinition {
  const card = svTcglCard(id), profile = svTcglProfile(id, variant), surface = surfaces.get(`${id}:${variant}`);
  return {
    id: `pokemon:${id}:${variant}`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${svTcglCollectorNumber(id)} · ${card.rarity} · ${printVariantLabel(variant)}`,
    dimensions: DIMENSIONS.standard, front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 2023000,
    pickerHidden: !surface, pokemon: { ...card, variant, materialProfile: profile },
    layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
    ...(surface ? {
      maps: surface.maps,
      mapSettings: { normalScale: surface.textured ? 1 : 0, embossStrength: 0, roughnessMode: surface.textured ? 'absolute' : 'profile' },
      ...(surface.textured ? { profileOverrides: tcglEtchedFinish } : {}),
    } : {}),
    source: { image: card.front!, metadata: surface?.evidence ?? `/cards/pokemon/tcgl-sv/${card.setId}/catalog.json`,
      notes: 'Exact English TCGL retail printing. Foil coverage and optional offline etch normal use this printing’s own sources.' },
  };
}
export const svTcglPickerCards = () => svTcglCards.flatMap(card => card.variants
  .filter(variant => variant !== 'normal').map(variant => svTcglDefinition(card.id, variant)));
