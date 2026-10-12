import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import { tcglBwSurfaces } from './data/bw-tcgl.generated.ts';
import { svTcglCard, svTcglCollectorNumber, svTcglFront } from './SvTcglCatalog.ts';
import { printVariantLabel, type PrintVariant } from './types.ts';
import { tcglEtchedFinish } from '../materials/profiles/tcglEtchedFinish.ts';

const surfaces = new Map(tcglBwSurfaces.map(s => [`${s.cardId}:${s.variant}`, s]));
export function bwDefinition(id: string, variant: PrintVariant): CardDefinition {
  const card = svTcglCard(id), surface = surfaces.get(`${id}:${variant}`);
  if (!surface || !card.variants.includes(variant)) throw new Error(`Missing exact BW printing ${id}:${variant}`);
  const front = svTcglFront(id, variant), deferred = surface.treatmentStatus === 'deferred';
  return {
    id: `pokemon:${id}:${variant}`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${svTcglCollectorNumber(id)} · ${card.rarity} · ${printVariantLabel(variant)}${deferred ? ' · ' + surface.deferredEffect + ' finish pending' : ''}`,
    dimensions: DIMENSIONS.standard, front, back: '/cards/pokemon/back.jpg',
    profile: surface.profile, seed: 2014000, galleryVisible: variant === 'normal',
    pokemon: { ...card, front, thumbnail: front, variant, materialProfile: surface.profile,
      ...(deferred ? { treatmentStatus: 'deferred' as const } : {}) },
    layout: { artwork: [0,0,1,1], innerFrame: [0,0,1,1] },
    maps: surface.maps,
    mapSettings: { normalScale: surface.textured ? 1 : 0, embossStrength: 0,
      roughnessMode: 'absolute', embossMaskFromNormalAlpha: false },
    ...(surface.textured ? { profileOverrides: tcglEtchedFinish } : surface.profile === 'pokemon-sheen' ? {
      // Existing diffraction and reflections, with smooth BW stock. No
      // procedural engraving, facet variance or sparkle on early Full Arts.
      profileOverrides: {
        structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0,
          facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
        glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
        diffraction: { facetCoupling: 0, followsAuthoredNormals: false },
        mapSettings: { normalScale: 0, embossStrength: 0, roughnessMode: 'absolute', embossMaskFromNormalAlpha: false },
      },
    } : {}),
    source: { image: front, metadata: surface.evidence,
      notes: `Exact English TCGL printing ${surface.tcglVariantId ?? surface.tcglCardId}. Own original fronts, foil/etch references and hashes retained in ${surface.evidence}. ` +
        (deferred ? `${surface.deferredEffect} finish pending; clean front with print-only material. No simulated replacement foil.` :
          surface.textured ? 'Exact TCGL etch converted offline to a single authored tangent normal; no runtime emboss.' :
          'Existing compatible material with exact source coverage and motif values. No generated relief or replacement texture.') },
  };
}
export function bwProfile(id: string, variant: PrintVariant): string {
  const surface = surfaces.get(`${id}:${variant}`);
  if (!surface) throw new Error(`Missing exact BW printing ${id}:${variant}`);
  return surface.profile;
}
