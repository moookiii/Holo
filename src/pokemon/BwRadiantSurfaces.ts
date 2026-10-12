import type { tcglBwSurfaces } from './data/bw-tcgl.generated.ts';

type Surface = typeof tcglBwSurfaces[number];
/** Offline PNGs, loaded on demand through the usual cached map pipeline. */
export function bwRadiantSurface(source: Surface): Surface {
  if (!source.cardId.startsWith('bw11r-')) return source;
  const n = Number(source.cardId.slice('bw11r-'.length));
  if (!Number.isInteger(n) || n < 1 || n > 25) throw new Error(`Unknown BW RC printing ${source.cardId}`);
  if (source.originalAssets.etch) throw new Error(`Unreviewed BW RC etch ${source.tcglVariantId}`);
  const common = source.foilType === 'NonFoil';
  if (!common && !source.originalAssets.foil) throw new Error(`Missing BW RC whiteplate ${source.tcglVariantId}`);
  const root = `/cards/pokemon/bw-radiant/${n}`;
  return { ...source, profile: common ? 'bw-radiant-overcoat' : 'bw-radiant-glitter',
    treatmentStatus: 'existing-material', deferredEffect: null, textured: false,
    maps: { foil: `${root}/foil.png`, laminate: `${root}/laminate.png`,
      ...(common ? { pattern: `${root}/pattern.png` } : {}),
      ...(!common ? { foilControls: `${root}/foil-controls.png`, secondaryFoil: `${root}/secondary.png` } : {}) },
    evidence: `${root}/evidence.json` };
}
