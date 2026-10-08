import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import { tcglEtchedFinish } from '../materials/profiles/tcglEtchedFinish.ts';
import { goldEtchedFinish } from '../materials/profiles/goldEtchedFinish.ts';
import { canonicalProfileId } from '../materials/profiles/ProfileAliases.ts';
import { doubleRareProfile } from '../materials/profiles/doubleRare.ts';
import { tcglSvSurfaces } from './data/sv-tcgl-surfaces.generated.ts';
import { svTcglCard, svTcglCards, svTcglCollectorNumber, svTcglFront } from './SvTcglCatalog.ts';
import { printVariantLabel, type PrintVariant } from './types.ts';

const surfaces = new Map(tcglSvSurfaces.map(surface => [`${surface.cardId}:${surface.variant}`, surface]));
export function svTcglProfile(id: string, variant: PrintVariant): string {
  const card = svTcglCard(id);
  if (!card.variants.includes(variant)) throw new Error(`Invalid TCGL printing: ${id}:${variant}`);
  if (variant === 'normal') return 'print-only';
  const surface = surfaces.get(`${id}:${variant}`);
  if (!surface) throw new Error(`Missing exact TCGL surface: ${id}:${variant}`);
  return canonicalProfileId(surface.profile);
}
export function svTcglDefinition(id: string, variant: PrintVariant): CardDefinition {
  const card = svTcglCard(id), profile = svTcglProfile(id, variant), surface = surfaces.get(`${id}:${variant}`);
  const front = svTcglFront(id, variant);
  return {
    id: `pokemon:${id}:${variant}`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${svTcglCollectorNumber(id)} · ${card.rarity} · ${printVariantLabel(variant)}`,
    dimensions: DIMENSIONS.standard, front, back: '/cards/pokemon/back.jpg', profile, seed: 2023000,
    pickerHidden: !surface, galleryVisible: variant === 'normal', pokemon: { ...card, front, thumbnail: front, variant, materialProfile: profile },
    layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
    ...(surface ? {
      maps: surface.maps,
      mapSettings: { normalScale: surface.textured && profile !== 'pokemon-ace-spec' ? 1 : 0, embossStrength: 0, roughnessMode: surface.textured && profile !== 'pokemon-ace-spec' ? 'absolute' : 'profile' },
      ...(surface.textured && profile !== 'pokemon-ace-spec' ? { profileOverrides: profile === 'gold-etched' ? goldEtchedFinish : tcglEtchedFinish } : {}),
      ...(!surface.textured && surface.foilType === 'SUN_PILLAR' && (card.rarity === 'Double Rare' || card.setId === 'svp' && card.suffix === 'ex' || card.setId === 'svalt' && card.suffix === 'ex')
        ? { profileOverrides: doubleRareProfile } : {}),
    } : {}),
    source: { image: front, metadata: surface?.evidence ?? `/cards/pokemon/tcgl-sv/${card.setId}/catalog.json`,
      notes: 'Exact English TCGL retail printing. Foil coverage and optional offline etch normal use this printing’s own sources.' },
  };
}
export const svTcglPickerCards = () => svTcglCards.flatMap(card => card.variants
  .filter(variant => variant !== 'normal').map(variant => svTcglDefinition(card.id, variant)));
export const svTcglGalleryCards = () => svTcglCards.filter(card => card.variants.includes('normal'))
  .map(card => svTcglDefinition(card.id, 'normal'));
