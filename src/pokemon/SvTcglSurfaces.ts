import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import { tcglEtchedFinish } from '../materials/profiles/tcglEtchedFinish.ts';
import { goldEtchedFinish } from '../materials/profiles/goldEtchedFinish.ts';
import { canonicalProfileId } from '../materials/profiles/ProfileAliases.ts';
import { megaRarityProfile } from '../materials/profiles/megaRarity.ts';
import { tcglSvSurfaces } from './data/sv-tcgl-surfaces.generated.ts';
import { tcglMegaSurfaces } from './data/mega-tcgl.generated.ts';
import { tcglMepSurfaces } from './data/mep-tcgl.generated.ts';
import { tcglSwshSurfaces } from './data/swsh-tcgl.generated.ts';
import { tcglSmSurfaces } from './data/sm-tcgl.generated.ts';
import { svTcglCard, svTcglCards, svTcglCollectorNumber, svTcglFront, svTcgdexNonfoilSource, svNonfoilImageProvider } from './SvTcglCatalog.ts';
import { printVariantLabel, type PrintVariant } from './types.ts';
import { isPrismStar, prismStarMaps } from './PrismStarSurfaces.ts';
import { xyDefinition, xyProfile } from './XySurfaces.ts';

const surfaces = new Map([...tcglSvSurfaces, ...tcglMegaSurfaces, ...tcglMepSurfaces, ...tcglSwshSurfaces, ...tcglSmSurfaces].map(surface => [`${surface.cardId}:${surface.variant}`, surface]));
const smSurfaces = new Map(tcglSmSurfaces.map(s => [`${s.cardId}:${s.variant}`, s]));
const swshLimitations = new Map(tcglSwshSurfaces.map(s => [`${s.cardId}:${s.variant}`, s.limitations]));
export function svTcglProfile(id: string, variant: PrintVariant): string {
  const card = svTcglCard(id);
  if (card.seriesId === 'xy') return xyProfile(id, variant);
  if (!card.variants.includes(variant)) throw new Error(`Invalid TCGL printing: ${id}:${variant}`);
  if (variant === 'normal') return 'print-only';
  const surface = surfaces.get(`${id}:${variant}`);
  if (!surface) throw new Error(`Missing exact TCGL surface: ${id}:${variant}`);
  if (isPrismStar(id, variant)) return 'pokemon-sm-prism-star';
  return megaRarityProfile(card.rarity) ?? canonicalProfileId(surface.profile);
}
export function svTcglDefinition(id: string, variant: PrintVariant): CardDefinition {
  if (svTcglCard(id).seriesId === 'xy') return xyDefinition(id, variant);
  const card = svTcglCard(id), profile = svTcglProfile(id, variant), surface = surfaces.get(`${id}:${variant}`);
  const front = svTcglFront(id, variant);
  const fallbackSource = svTcgdexNonfoilSource(id);
  const megaFinish = profile === 'mega-attack-rare' || profile === 'mega-hyper-rare';
  const swsh = card.seriesId === 'swsh';
  const sm = card.seriesId === 'sm';
  const prism = isPrismStar(id, variant);
  const smSurface = smSurfaces.get(`${id}:${variant}`);
  const deferred = !prism && (swsh && swshLimitations.get(`${id}:${variant}`)?.length || smSurface?.treatmentStatus === 'deferred');
  return {
    id: `pokemon:${id}:${variant}`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${svTcglCollectorNumber(id)} · ${card.rarity} · ${printVariantLabel(variant)}${!prism && smSurface?.deferredEffect ? ' · ' + smSurface.deferredEffect + ' finish pending' : ''}`,
    dimensions: DIMENSIONS.standard, front, back: '/cards/pokemon/back.jpg', profile, seed: 2023000,
    pickerHidden: !surface && !fallbackSource, galleryVisible: variant === 'normal', pokemon: { ...card, front, thumbnail: front, variant, materialProfile: profile,
      ...(deferred || !sm && !megaFinish && 'treatmentStatus' in (surface ?? {}) ? { treatmentStatus: 'deferred' as const } : {}) },
    ...(prism ? { stockSurface: { strength: 0, depth: 0 } } : {}),
    layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
    ...(surface ? {
      maps: { ...surface.maps, ...(prism ? prismStarMaps(id) : {}), ...(megaFinish ? { secondaryFoil: `/cards/pokemon/mega-optics/${id}-secondary.png` } : {}) },
      mapSettings: { normalScale: surface.textured && profile !== 'pokemon-ace-spec' ? 1 : 0, embossStrength: 0, roughnessMode: !prism && (sm || surface.textured && profile !== 'pokemon-ace-spec') ? 'absolute' : 'profile', ...(sm ? { embossMaskFromNormalAlpha: false } : {}) },
      ...(surface.textured && profile !== 'pokemon-ace-spec' && !megaFinish && !swsh ? { profileOverrides: sm ? tcglEtchedFinish : profile === 'gold-etched' ? goldEtchedFinish : tcglEtchedFinish } : {}),
    } : {}),
    source: { image: front, metadata: fallbackSource ?? surface?.evidence ?? `${front.slice(0,front.lastIndexOf('/'))}/catalog.json`,
      notes: prism ? 'Exact TCGL foil and opaque print protection, plus registered outer-border coverage. Shared Prism Star optical sheet; no etch exists in these exports. Research: docs/prism-star-finish-research.md; implementation: docs/prism-star-implementation.md.' : sm ? `Exact English TCGL source ${smSurface?.tcglVariantId ?? ('sourceIdentifier' in (smSurface ?? {}) ? (smSurface as {sourceIdentifier:string}).sourceIdentifier : 'see evidence')}. Original source hashes and offline full-card registration are recorded in ${surface?.evidence}.${smSurface?.deferredEffect ? ' ' + smSurface.deferredEffect + ' optical treatment is provisional and reserved for the next pass.' : ' Existing material; exact own etch with the Sylveon/Espeon authored-normal response where textured.'}` : fallbackSource ? `English nonfoil printing. Image provider: ${svNonfoilImageProvider(id)}; metadata: TCGdex. Source and original image hash recorded; print-only material.` :
        (profile === 'svp-cosmos' ? 'Exact TCGL front, foil and protection. User-approved shared promo Cosmos sheet; motif positions are not a physical-copy match.' : card.setId === 'mep' ? 'Exact MEP TCGL promo front and printing-specific maps. Etched cards use the offline Sylveon/Espeon response. Stamped optics retain the original front pending exact-print evidence; see docs/mep-promos.md.' : megaFinish ? 'Exact TCGL geometry and coverage with a dedicated photo-reviewed Mega rarity finish. Optical evidence and limitations: docs/mega-optics.md.' : 'treatmentStatus' in (surface ?? {}) ? 'Exact TCGL assets; temporary reference finish. Mega Attack Rare / Mega Hyper Rare physical optical development reserved for Astra High.' :
          card.setId === 'me02.5' && variant === 'special-reverse' ? 'Exact TCGL ph2 printing retained. Published ph2 foil PNG duplicates its ordinary ph map; assigned special motif geometry is unavailable in this export. Source discrepancy recorded in research/tcgl/mega-series/me2-5/batch-validation.json.' :
          'Exact English TCGL retail printing. Foil coverage and optional offline etch normal use this printing’s own sources.') },
  };
}
export const svTcglPickerCards = () => svTcglCards.flatMap(card => card.variants
  .filter(variant => variant !== 'normal').map(variant => svTcglDefinition(card.id, variant)));
export const svTcglGalleryCards = () => svTcglCards.filter(card => card.variants.includes('normal'))
  .map(card => svTcglDefinition(card.id, 'normal'));
