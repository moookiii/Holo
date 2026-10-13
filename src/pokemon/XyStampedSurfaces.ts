import type { tcglXySurfaces } from './data/xy-tcgl.generated.ts';

type Surface = typeof tcglXySurfaces[number];
export const xyWorldsStampNumbers = [27, 91, 176] as const;
const identities = new Set(xyWorldsStampNumbers.map(n => `xybsp-${n}:holo`));

export function xyStampedSurface(source: Surface): Surface {
  if (!identities.has(`${source.cardId}:${source.variant}`)) return source;
  const number = source.cardId.slice('xybsp-'.length);
  if (source.tcglCardId !== `xybsp_${number}` || source.foilType !== 'Stamped'
    || !source.originalAssets.foil || source.originalAssets.etch
    || source.tcglVariantId !== `ChampionsFestival_xybsp_${number}_op_Rare_Stamped_Stamped`) {
    throw new Error(`Unreviewed XY Worlds stamp ${source.tcglVariantId}`);
  }
  const root = `/cards/pokemon/xy-worlds-stamps/${source.cardId}`;
  return { ...source, profile: 'bw-stamped', textured: false,
    treatmentStatus: 'existing-material', deferredEffect: null,
    maps: { foil: `${root}/foil.png`, foilControls: `${root}/foil-controls.png`, roughness: `${root}/roughness.png` },
    evidence: `${root}/evidence.json` };
}
