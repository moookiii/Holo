import type { tcglXySurfaces } from './data/xy-tcgl.generated.ts';

type Surface = typeof tcglXySurfaces[number];
// Representatives were authored and reviewed in this order before extending the set.
export const generationsReviewOrder = [6, 5, 28, 29, 30, 31, 32, 21] as const;
export function generationsSurface(source: Surface): Surface {
  if (!source.cardId.startsWith('xy9-5r-')) return source;
  const number = Number(source.cardId.slice('xy9-5r-'.length));
  if (!Number.isInteger(number) || number < 1 || number > 32) throw new Error(`Unknown RC printing ${source.cardId}`);
  if (source.originalAssets.etch) throw new Error(`Unreviewed RC etch ${source.tcglVariantId}`);
  const nonfoil = source.foilType === 'NonFoil';
  if (!nonfoil && (source.foilType !== 'FlatSilver' || !source.originalAssets.foil)) throw new Error(`Missing exact RC silver plate ${source.tcglVariantId}`);
  const root = `/cards/pokemon/generations-rc/${number}`;
  return { ...source, profile: nonfoil ? 'print-only' : number >= 28 ? 'generations-rc-full-art' : number === 6 || number === 21 ? 'generations-rc-ex' : 'generations-rc-holo', textured: false,
    treatmentStatus: 'existing-material', deferredEffect: null,
    maps: nonfoil ? {} : { foil: `${root}/foil.png` }, evidence: `${root}/evidence.json` };
}
