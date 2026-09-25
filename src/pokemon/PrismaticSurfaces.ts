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
}

// Populate only after the per-printing photo, map and rendered-tilt review.
// No generic Mirage/rainbow-etched fallback may stand in for a missing surface.
const surfaces: Readonly<Record<string, PrismaticSurface>> = {
  'sv08.5-150:holo': {
    profile: 'prismatic_sir_texture',
    maps: {
      foil: `${PRISMATIC_ASSETS}/maps/150-holo-foil.png`, protection: `${PRISMATIC_ASSETS}/maps/150-holo-protection.png`,
      height: `${PRISMATIC_ASSETS}/maps/150-holo-height.png`, normal: `${PRISMATIC_ASSETS}/maps/150-holo-normal.png`,
      roughness: `${PRISMATIC_ASSETS}/maps/150-holo-roughness.png`, secondaryFoil: `${PRISMATIC_ASSETS}/maps/150-holo-secondary-foil.png`,
    },
    layout: { artwork: [23/600,137/825,577/600,708/825], innerFrame: [23/600,23/825,577/600,802/825] },
    mapSettings: { normalScale: 1, embossStrength: 0, roughnessMode: 'absolute' },
    profileOverrides: { surface: { metalness: .58, laminate: .07, foilReflectance: .035, etchedInkSheen: 1.1 }, secondary: {
      diffraction: { strength: .46 }, glints: { density: .94, scale: 620, sharpness: 125, strength: 10 },
    } },
    evidence: `${PRISMATIC_ASSETS}/maps/150-holo-evidence.json`,
  },
  'sv08.5-167:holo': {
    profile: 'prismatic_sir_texture',
    maps: {
      foil: `${PRISMATIC_ASSETS}/maps/167-holo-foil.png`, protection: `${PRISMATIC_ASSETS}/maps/167-holo-protection.png`,
      height: `${PRISMATIC_ASSETS}/maps/167-holo-height.png`, normal: `${PRISMATIC_ASSETS}/maps/167-holo-normal.png`,
      roughness: `${PRISMATIC_ASSETS}/maps/167-holo-roughness.png`, secondaryFoil: `${PRISMATIC_ASSETS}/maps/167-holo-secondary-foil.png`,
    },
    layout: { artwork: [23/600,137/825,577/600,708/825], innerFrame: [23/600,23/825,577/600,802/825] },
    mapSettings: { normalScale: 1, embossStrength: 0, roughnessMode: 'absolute' },
    evidence: `${PRISMATIC_ASSETS}/maps/167-holo-evidence.json`,
    profileOverrides: { surface: { metalness: .55, laminate: .06, foilReflectance: .035, etchedInkSheen: .9 }, secondary: {
      diffraction: { strength: .48 },
      glints: { density: .96, scale: 620, sharpness: 120, strength: 10 },
    } },
  },
  'sv08.5-146:holo': {
    profile: 'prismatic_sir_texture',
    maps: {
      foil: `${PRISMATIC_ASSETS}/maps/146-holo-foil.png`, protection: `${PRISMATIC_ASSETS}/maps/146-holo-protection.png`,
      height: `${PRISMATIC_ASSETS}/maps/146-holo-height.png`, normal: `${PRISMATIC_ASSETS}/maps/146-holo-normal.png`,
      roughness: `${PRISMATIC_ASSETS}/maps/146-holo-roughness.png`, secondaryFoil: `${PRISMATIC_ASSETS}/maps/146-holo-secondary-foil.png`,
    },
    layout: { artwork: [23/600,137/825,577/600,708/825], innerFrame: [23/600,23/825,577/600,802/825] },
    mapSettings: { normalScale: 1, embossStrength: 0, roughnessMode: 'absolute' },
    evidence: `${PRISMATIC_ASSETS}/maps/146-holo-evidence.json`,
  },
  'sv08.5-161:holo': {
    profile: 'prismatic_sir_texture',
    maps: {
      foil: `${PRISMATIC_ASSETS}/maps/161-holo-foil.png`, protection: `${PRISMATIC_ASSETS}/maps/161-holo-protection.png`,
      height: `${PRISMATIC_ASSETS}/maps/161-holo-height.png`, normal: `${PRISMATIC_ASSETS}/maps/161-holo-normal.png`,
      roughness: `${PRISMATIC_ASSETS}/maps/161-holo-roughness.png`,
      secondaryFoil: `${PRISMATIC_ASSETS}/maps/161-holo-secondary-foil.png`,
    },
    layout: { artwork: [23/600,137/825,577/600,708/825], innerFrame: [23/600,23/825,577/600,802/825] },
    mapSettings: { normalScale: 1, embossStrength: 0, roughnessMode: 'absolute' },
    evidence: `${PRISMATIC_ASSETS}/maps/161-holo-evidence.json`,
  },
  'sv08.5-133:holo': {
    profile: 'prismatic_fullart_texture',
    maps: {
      foil: `${PRISMATIC_ASSETS}/maps/133-holo-foil.png`, protection: `${PRISMATIC_ASSETS}/maps/133-holo-protection.png`,
      height: `${PRISMATIC_ASSETS}/maps/133-holo-height.png`, normal: `${PRISMATIC_ASSETS}/maps/133-holo-normal.png`,
      roughness: `${PRISMATIC_ASSETS}/maps/133-holo-roughness.png`,
    },
    layout: { artwork: [23/600,112/825,577/600,802/825], innerFrame: [23/600,23/825,577/600,802/825] },
    mapSettings: { normalScale: 1.35, embossStrength: 0, roughnessMode: 'absolute' },
    evidence: `${PRISMATIC_ASSETS}/maps/133-holo-evidence.json`,
  },
  ...Object.fromEntries(['116', '117', '119', '128', '129', '131'].map(number => [`sv08.5-${number}:holo`, {
    profile: 'prismatic_ace_spec',
    maps: { foil: `${PRISMATIC_ASSETS}/maps/${number}-holo-foil.png`, protection: `${PRISMATIC_ASSETS}/maps/${number}-holo-protection.png` },
    layout: { artwork: [49 / 600, 119 / 825, 551 / 600, 426 / 825], innerFrame: [23 / 600, 23 / 825, 577 / 600, 803 / 825] },
    mapSettings: { embossStrength: 0, normalScale: 0 },
    evidence: `${PRISMATIC_ASSETS}/maps/${number}-holo-evidence.json`,
  } satisfies PrismaticSurface])),
  ...Object.fromEntries(['005', '013', '022', '025', '029', '033', '040', '059'].map(number => [`sv08.5-${number}:holo`, {
    profile: 'prismatic_regular_holo',
    maps: { foil: `${PRISMATIC_ASSETS}/maps/${number}-holo-foil.png`, protection: `${PRISMATIC_ASSETS}/maps/${number}-holo-protection.png` },
    layout: { artwork: [49 / 600, 94 / 825, 552 / 600, 389 / 825], innerFrame: [23 / 600, 23 / 825, 577 / 600, 802 / 825] },
    mapSettings: { embossStrength: 0, normalScale: 0 },
    evidence: `${PRISMATIC_ASSETS}/maps/${number}-holo-evidence.json`,
  } satisfies PrismaticSurface])),
};
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
    || (printing.textured && (!surface.maps.height || !surface.maps.normal || !surface.maps.roughness))) {
    throw new Error(`Incomplete authored surface: ${id}:${variant}`);
  }
  return surface;
}

export function prismaticProfile(id: string, variant: PrintVariant): string {
  return prismaticSurface(id, variant)?.profile ?? 'print-only';
}

export function prismaticDefinition(id: string, variant: PrintVariant): CardDefinition {
  const card = prismaticCard(id), surface = prismaticSurface(id, variant);
  const deferred = variant === 'reverse';
  const profile = surface?.profile ?? 'print-only';
  return {
    id: `pokemon:${id}:${variant}`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${card.localId}/131 · ${card.rarity} · ${printVariantLabel(variant)}${deferred ? ' · foil pending' : ''}`,
    dimensions: DIMENSIONS.standard, front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 2025085,
    pickerHidden: !surface,
    pokemon: { ...card, variant, materialProfile: profile, ...(deferred ? { treatmentStatus: 'deferred' as const } : {}) },
    ...(surface ? { maps: surface.maps, layout: surface.layout, mapSettings: surface.mapSettings, profileOverrides: surface.profileOverrides } : {}),
    source: { image: card.front!, metadata: `${PRISMATIC_ASSETS}/catalog.json`,
      notes: surface ? `Exact-printing surface evidence: ${surface.evidence}` : deferred
        ? 'Standard SV reverse-holo rendering is intentionally deferred. This print-only face preserves the real pack outcome; no substitute foil is applied.'
        : 'Unmodified TCGdex front. Regular non-holo retail printing.' },
  };
}

export function prismaticSurfaceProgress() {
  const required = prismaticPrintings.filter(printing => printing.inScope && printing.treatment !== 'non-holo');
  const missing = required.filter(printing => !surfaces[prismaticSurfaceKey(printing.cardId, printing.variant)]);
  return { required: required.length, ready: required.length - missing.length, missing,
    complete: missing.length === 0 };
}

/** Only authored holo printings enter the picker. The full pool stays in packs. */
export function prismaticPickerCards(): CardDefinition[] {
  return prismaticPrintings.filter(printing => surfaces[prismaticSurfaceKey(printing.cardId, printing.variant)])
    .map(printing => prismaticDefinition(printing.cardId, printing.variant));
}
