import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import { tcglXySurfaces } from './data/xy-tcgl.generated.ts';
import { svTcglCard, svTcglCollectorNumber, svTcglFront } from './SvTcglCatalog.ts';
import { printVariantLabel, type PrintVariant } from './types.ts';
import { completedCosmosSurface } from './CompletedCosmosSurfaces.ts';
import { steamSiegeSurface } from './SteamSiegeSurfaces.ts';

import { generationsSurface } from './GenerationsSurfaces.ts';
const surfaces = new Map(tcglXySurfaces.map(steamSiegeSurface).map(generationsSurface).map(completedCosmosSurface).map(s => [`${s.cardId}:${s.variant}`, s]));
export function xyDefinition(id: string, variant: PrintVariant): CardDefinition {
  const card = svTcglCard(id), surface = surfaces.get(`${id}:${variant}`);
  if (!surface || !card.variants.includes(variant)) throw new Error(`Missing exact XY printing ${id}:${variant}`);
  const front = svTcglFront(id, variant), deferred = surface.treatmentStatus === 'deferred';
  return {
    id: `pokemon:${id}:${variant}`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${svTcglCollectorNumber(id)} · ${card.rarity} · ${printVariantLabel(variant)}${deferred ? ' · ' + surface.deferredEffect + ' finish pending' : ''}`,
    dimensions: DIMENSIONS.standard, front, back: '/cards/pokemon/back.jpg',
    ...(id.startsWith('xy9-5r-') ? { physicalProfile: 'generations-rc' as const } : {}),
    profile: surface.profile, seed: 2014000, galleryVisible: variant === 'normal',
    ...(surface.profile === 'pokemon-break' ? { stockSurface: { strength: 0, depth: 0 },
      substrate: { color: [.62, .65, .68] as [number, number, number], printRetention: .06 } } : {}),
    pokemon: { ...card, front, thumbnail: front, variant, materialProfile: surface.profile,
      ...(deferred ? { treatmentStatus: 'deferred' as const } : {}) },
    layout: { artwork: [0,0,1,1], innerFrame: [0,0,1,1] },
    maps: surface.maps,
    mapSettings: { normalScale: 0, embossStrength: 0, roughnessMode: id.startsWith('xy9-5r-') ? 'profile' : 'absolute' },
    source: { image: front, metadata: surface.evidence,
      notes: `Exact English TCGL printing ${surface.tcglVariantId}. Own original fronts, foil/etch references and hashes retained in ${surface.evidence}. ` +
        (deferred ? `${surface.deferredEffect} finish pending; clean front with print-only material. No simulated replacement foil.` :
          surface.profile === 'pokemon-break' ? 'Video-calibrated square optical domains on exact TCGL coverage; printed gold metal remains separate. No etch or surface relief. See docs/pokemon-break.md.' :
          'Existing compatible material with exact source coverage and motif values. No generated relief or replacement texture.') },
  };
}
export function xyProfile(id: string, variant: PrintVariant): string {
  const surface = surfaces.get(`${id}:${variant}`);
  if (!surface) throw new Error(`Missing exact XY printing ${id}:${variant}`);
  return surface.profile;
}
