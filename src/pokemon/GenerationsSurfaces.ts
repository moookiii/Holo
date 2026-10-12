import type { tcglXySurfaces } from './data/xy-tcgl.generated.ts';

type Surface = typeof tcglXySurfaces[number];
// Add reference cards only after inspecting their own source plates, in review order.
export const generationsReviewOrder = [6, 5] as const;
const authored = new Set<number>(generationsReviewOrder);
export function generationsSurface(source: Surface): Surface {
  if (!source.cardId.startsWith('xy9-5r-')) return source;
  const number = Number(source.cardId.slice('xy9-5r-'.length));
  if (!authored.has(number)) return source;
  const root = `/cards/pokemon/generations-rc/${number}`;
  return { ...source, profile: number === 5 ? 'generations-rc-holo' : 'generations-rc-ex', textured: false,
    treatmentStatus: 'existing-material', deferredEffect: null,
    maps: { foil: `${root}/foil.png` }, evidence: `${root}/evidence.json` };
}
