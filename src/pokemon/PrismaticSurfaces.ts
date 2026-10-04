import { tcglEtchedFinish } from '../materials/profiles/tcglEtchedFinish.ts';
import { tcglPrismaticSurfaces } from './data/prismatic-surfaces.generated.ts';
import { prismaticEnergyPickerCards } from './PrismaticEnergySurfaces.ts';
import { DIMENSIONS, type CardDefinition, type CardMapPaths } from '../card/CardDefinition.ts';
import { PRISMATIC_ASSETS, prismaticCard, prismaticPrinting, prismaticPrintings } from './PrismaticCatalog.ts';
import { printVariantLabel, type PrintVariant } from './types.ts';

/** A finished surface is registered by exact printing, never by rarity alone.
 * Pending photo research and incomplete maps live in research/, not here.
 */
export interface PrismaticSurface {
  profile: string;
  maps: CardMapPaths;
  layout: NonNullable<CardDefinition['layout']>;
  mapSettings?: CardDefinition['mapSettings'];
  profileOverrides?: CardDefinition['profileOverrides'];
  /** Path to the audited photo/region manifest for this exact printing. */
  evidence: string;
  /** TCGL resource presence, independent of catalog rarity. */
  textured?: boolean;
}

// Preserve reviewed UV coordinates; all surface maps come from TCGL below.
const legacyLayouts: Readonly<Record<string, NonNullable<CardDefinition['layout']>>> = {
  ...Object.fromEntries(['144','155','153','156','149','150','167','146','161'].map(number => [`sv08.5-${number}:holo`, {
    artwork: [23/600,137/825,577/600,708/825], innerFrame: [23/600,23/825,577/600,802/825],
  } satisfies NonNullable<CardDefinition['layout']>])),
  'sv08.5-133:holo': { artwork: [23/600,112/825,577/600,802/825], innerFrame: [23/600,23/825,577/600,802/825] },
  ...Object.fromEntries(['116','117','119','128','129','131'].map(number => [`sv08.5-${number}:holo`, {
    artwork: [49/600,119/825,551/600,426/825], innerFrame: [23/600,23/825,577/600,803/825],
  } satisfies NonNullable<CardDefinition['layout']>])),
  ...Object.fromEntries(['005','013','022','025','029','033','040','059'].map(number => [`sv08.5-${number}:holo`, {
    artwork: [49/600,94/825,552/600,389/825], innerFrame: [23/600,23/825,577/600,802/825],
  } satisfies NonNullable<CardDefinition['layout']>])),
};
/** Exact TCGL assets replace the old region maps. Historical registrations are
 * consulted only for their reviewed normalized card layout coordinates.
 */
const surfaces: Readonly<Record<string, PrismaticSurface>> = Object.fromEntries(tcglPrismaticSurfaces.map(record => {
  const key = `${record.cardId}:${record.variant}`;
  return [key, {
    profile: record.profile, maps: record.maps, evidence: record.evidence, textured: record.textured,
    layout: legacyLayouts[key] ?? { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
    mapSettings: { normalScale: record.textured ? 1 : 0, embossStrength: 0, roughnessMode: record.textured ? 'absolute' : 'profile' },
    ...(record.textured ? { profileOverrides: tcglEtchedFinish } : {}),
  } satisfies PrismaticSurface];
}));
export const prismaticSurfaceKey = (id: string, variant: PrintVariant) => `${id}:${variant}`;

export class PrismaticSurfaceUnavailable extends Error {
  readonly cardId: string;
  readonly variant: PrintVariant;
  constructor(cardId: string, variant: PrintVariant) {
    super(`${prismaticCard(cardId).name} ${cardId.split('-').at(-1)} · ${printVariantLabel(variant)}: exact foil maps are not complete.`);
    this.name = 'PrismaticSurfaceUnavailable';
    this.cardId = cardId; this.variant = variant;
  }
}

export function prismaticSurface(id: string, variant: PrintVariant): PrismaticSurface | undefined {
  const printing = prismaticPrinting(id, variant);
  if (printing.treatment === 'non-holo' || !printing.inScope) return undefined;
  const surface = surfaces[prismaticSurfaceKey(id, variant)];
  if (!surface) throw new PrismaticSurfaceUnavailable(id, variant);
  if (surface.profile !== printing.profileId || !surface.maps.foil || !surface.maps.protection || !surface.evidence
    || (surface.textured && (!surface.maps.height || !surface.maps.normal || !surface.maps.roughness))) {
    throw new Error(`Incomplete authored surface: ${id}:${variant}`);
  }
  return surface;
}

export function prismaticProfile(id: string, variant: PrintVariant): string {
  return prismaticSurface(id, variant)?.profile ?? 'print-only';
}

export function prismaticDefinition(id: string, variant: PrintVariant): CardDefinition {
  const card = prismaticCard(id), surface = prismaticSurface(id, variant);
  const profile = surface?.profile ?? 'print-only';
  return {
    id: `pokemon:${id}:${variant}`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${card.localId}/131 · ${card.rarity} · ${printVariantLabel(variant)}`,
    dimensions: DIMENSIONS.standard, front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 2025085,
    pickerHidden: !surface, galleryVisible: variant === 'normal',
    pokemon: { ...card, variant, materialProfile: profile },
    ...(surface ? { maps: surface.maps, layout: surface.layout, mapSettings: surface.mapSettings, profileOverrides: surface.profileOverrides } : {}),
    source: { image: card.front!, metadata: `${PRISMATIC_ASSETS}/catalog.json`,
      notes: surface ? `Exact TCGL printing foil/etch evidence: ${surface.evidence}`
        : 'Unmodified clean front. Regular non-holo retail printing.' },
  };
}

export function prismaticSurfaceProgress() {
  const required = prismaticPrintings.filter(printing => printing.inScope && printing.treatment !== 'non-holo');
  const missing = required.filter(printing => !surfaces[prismaticSurfaceKey(printing.cardId, printing.variant)]);
  return { required: required.length, ready: required.length - missing.length, missing,
    complete: missing.length === 0 };
}

/** Only exact registered foil printings enter the main card picker. */
export function prismaticPickerCards(): CardDefinition[] {
  return [...prismaticPrintings.filter(printing => surfaces[prismaticSurfaceKey(printing.cardId, printing.variant)])
    .map(printing => prismaticDefinition(printing.cardId, printing.variant)), ...prismaticEnergyPickerCards()];
}

/** Regular non-holo printings stay out of the main picker and appear in the gallery. */
export function prismaticGalleryCards(): CardDefinition[] {
  return prismaticPrintings.filter(printing => printing.variant === 'normal')
    .map(printing => prismaticDefinition(printing.cardId, printing.variant));
}
