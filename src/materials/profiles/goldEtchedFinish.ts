import type { CardProfileOverrides } from '../HolographicProfile';
import { tcglEtchedFinish } from './tcglEtchedFinish.ts';

/** Luxurious Cape 265/182 photo calibration. Keep the exact TCGL die at gain 1;
 * change the light budget and filter subpixel reflection, never the geometry.
 * Coverage remains the printing's own continuous foil/protection PNGs.
 */
export const goldEtchedFinish: CardProfileOverrides = {
  ...tcglEtchedFinish,
  diffraction: { ...tcglEtchedFinish.diffraction, bandwidth: .032, strength: 1.05,
    secondaryOrder: .045, crossWidth: .30, normalFiltering: 1 },
  // Dense metal grains seen on the border and raised trim. These are fixed
  // optical microfacets, clipped by exact foil coverage; no generated relief.
  glints: { density: 1, scale: 1050, sharpness: 180, strength: 3.2, spread: .32, metallicGrain: true },
  surface: { ...tcglEtchedFinish.surface, metalness: .65, substrateReflection: .30,
    foilReflectance: .015, inkTransmission: 1, etchedInkSheen: .65, coverageRoughness: .12, inkSpecular: 1 },
};
