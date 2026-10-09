import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import { tcglEtchedFinish } from '../materials/profiles/tcglEtchedFinish.ts';
import { celebrationRecords, celebrationSurfaces } from './data/30th.generated.ts';
import { celebrationCard } from './CelebrationCatalog.ts';
import type { PrintVariant } from './types.ts';

const records = new Map(celebrationRecords.map(record => [record.id as string, record]));
const surfaces = new Map(celebrationSurfaces.map(surface => [surface.cardId as string, surface]));
export function celebrationProfile(id: string, variant: PrintVariant): string {
  if (variant !== 'holo') throw new Error(`Anniversary printing has no ${variant} variant: ${id}`);
  const surface = surfaces.get(id);
  if (!surface) throw new Error(`Missing exact anniversary surface: ${id}`);
  return surface.profile;
}
export function celebrationDefinition(id: string, variant: PrintVariant = 'holo'): CardDefinition {
  const card = celebrationCard(id), profile = celebrationProfile(id, variant), surface = surfaces.get(id)!, record = records.get(id)!;
  return {
    id: `pokemon:${id}:holo`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${record.collectorNumber} · ${card.rarity}`, dimensions: DIMENSIONS.standard,
    front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 202630,
    galleryVisible: true, pokemon: { ...card, variant: 'holo', materialProfile: profile, treatmentStatus: 'deferred' },
    layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
    maps: card.setId === '30th-rgb' ? { ...surface.maps, foilControls: surface.maps.foil } : surface.maps,
    mapSettings: { normalScale: surface.textured ? 1 : 0, embossStrength: 0, roughnessMode: 'absolute' },
    profileOverrides: surface.textured ? tcglEtchedFinish : {
      maps: { direction: undefined },
      opticalModel: card.rarity === 'Double Rare' ? 'sv-sun-pillar' : 'sv151-illustration',
      // Uniform temporary response only. Do not synthesize a replacement TCGL
      // motif through an older profile's procedural field or sparkle.
      structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
      glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
    },
    source: { image: card.front!, metadata: surface.evidence,
      notes: 'Original exact TCGL front and RGBA foil map. Offline reference etch normal where supplied. Temporary existing material; physical optics and precise region review pending Astra High.' },
  };
}
export const celebrationGalleryCards = () => celebrationCardsForGallery();
function celebrationCardsForGallery() { return celebrationRecords.map(record => celebrationDefinition(record.id)); }
