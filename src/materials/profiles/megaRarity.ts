import type { HolographicProfile } from '../HolographicProfile';
import { prismaticProfiles } from './prismatic.ts';
import { tcglEtchedFinish } from './tcglEtchedFinish.ts';
import { goldEtchedFinish } from './goldEtchedFinish.ts';

const reference = prismaticProfiles.find(profile => profile.id === 'prismatic_sir_texture')!;
const plain = { ...reference.structure, ...tcglEtchedFinish.structure };
const settings = { ...tcglEtchedFinish.mapSettings };

/** Reflection-only differences. All relief is the printing's offline TCGL normal.
 * Supplemental secondary coverage is authored from that printing's exact maps.
 * Photo calibration: Gengar 269/217, Dragonite 271/217, Lucario 188/132 and
 * Gardevoir 187/132. See docs/mega-optics.md for evidence and uncertainty.
 */
export const megaAttackRare: HolographicProfile = {
  ...reference, id: 'mega-attack-rare', name: 'Mega Attack Rare', status: 'development',
  description: 'Exact etched artwork with directional foil and independently masked fine attack-letter reflection.',
  mapSettings: settings, structure: plain,
  diffraction: { ...reference.diffraction, strength: .46, bandwidth: .042, secondaryOrder: .045, normalFiltering: 1 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { ...reference.surface, ...tcglEtchedFinish.surface, metalness: .52,
    laminate: .045, foilReflectance: .018, inkTransmission: .82, etchedInkSheen: .85, inkSpecular: 1 },
  secondary: {
    structure: plain,
    diffraction: { ...reference.diffraction, period: 1.1, strength: .34, bandwidth: .04,
      secondaryOrder: .035, crossWidth: .32, normalFiltering: 1 },
    // Ordered microdiamonds, confined to source glyphs. No random stars or relief.
    glints: { density: .94, scale: 620, sharpness: 125, strength: 3.2, spread: .46, microdiamond: true },
    surface: { ...reference.surface, ...tcglEtchedFinish.surface, metalness: .72, roughness: .27,
      laminate: .065, foilReflectance: .022, inkTransmission: .86, etchedInkSheen: .65 },
  },
};

export const megaHyperRare: HolographicProfile = {
  ...reference, id: 'mega-hyper-rare', name: 'Mega Hyper Rare', status: 'development',
  description: 'Gold etched subject and fine metallic grain with separately controlled exposed-sheet diffraction.',
  mapSettings: settings, structure: plain,
  diffraction: { ...reference.diffraction, ...goldEtchedFinish.diffraction, strength: .16,
    secondaryOrder: .025, bandwidth: .034 },
  glints: { density: 1, scale: 1050, sharpness: 180, strength: 1.8, spread: .32, metallicGrain: true },
  surface: { ...reference.surface, ...goldEtchedFinish.surface, metalness: .68,
    laminate: .035, foilReflectance: .012, inkTransmission: 1, etchedInkSheen: .65, substrateReflection: .50, coverageRoughness: 0 },
  secondary: {
    structure: plain,
    diffraction: { ...reference.diffraction, ...goldEtchedFinish.diffraction,
      strength: .90, bandwidth: .034, secondaryOrder: .045, crossWidth: .30 },
    glints: { density: 1, scale: 1050, sharpness: 180, strength: 1.2, spread: .32, metallicGrain: true },
    surface: { ...reference.surface, ...goldEtchedFinish.surface, metalness: .68, roughness: .30,
      laminate: .035, foilReflectance: .012, inkTransmission: .30, etchedInkSheen: .65, substrateReflection: .50, coverageRoughness: 0 },
  },
};
export const megaRarityProfiles = [megaAttackRare, megaHyperRare];

export function megaRarityProfile(rarity: string): string | undefined {
  return rarity === 'Mega Attack Rare' ? megaAttackRare.id : rarity === 'Mega Hyper Rare' ? megaHyperRare.id : undefined;
}
