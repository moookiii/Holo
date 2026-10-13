import type { tcglBwSurfaces } from './data/bw-tcgl.generated.ts';
type Surface = typeof tcglBwSurfaces[number];
export const bwVictoryNumbers = [29, 30, 31] as const;
export const bwUnreleasedEnglishPromos = new Set(['bwbsp-77', 'bwbsp-78']);
const cups = new Set(bwVictoryNumbers.map(n => `bwbsp-${n}:holo`));
export function bwVictorySurface(source: Surface): Surface {
  if (bwUnreleasedEnglishPromos.has(source.cardId)) return { ...source,
    profile: 'print-only', textured: false, maps: {}, treatmentStatus: 'existing-material', deferredEffect: null };
  if (!cups.has(`${source.cardId}:${source.variant}`)) return source;
  const number = source.cardId.slice('bwbsp-'.length);
  if (source.tcglCardId !== `bwbsp_${number}` || !source.originalAssets.foil || source.originalAssets.etch)
    throw new Error(`Missing original Victory Cup plate ${source.cardId}`);
  const root = `/cards/pokemon/bw-victory/${source.cardId}`;
  return { ...source, profile: 'pokemon-crosshatch', textured: false,
    treatmentStatus: 'existing-material', deferredEffect: null,
    maps: { foil: `${root}/foil.png`, foilControls: `${root}/foil-controls.png` }, evidence: `${root}/evidence.json` };
}
