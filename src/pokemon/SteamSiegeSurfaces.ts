import type { tcglXySurfaces } from './data/xy-tcgl.generated.ts';

type Surface = typeof tcglXySurfaces[number];
export const steamSiegeSplitNumbers = [11, 15, 42, 64, 77] as const;
const identities = new Set(steamSiegeSplitNumbers.map(n => `xy11-${n}:reverse`));

export function steamSiegeSurface(source: Surface): Surface {
  if (!identities.has(`${source.cardId}:${source.variant}`)) return source;
  const number = source.cardId.slice('xy11-'.length);
  if (source.tcglCardId !== `xy11_${number}_ph` || !source.originalAssets.foil
    || source.originalAssets.etch || !source.tcglVariantId.endsWith('_Rainbow_Reverse')) {
    throw new Error(`Unreviewed Steam Siege split reverse ${source.tcglVariantId}`);
  }
  const root = `/cards/pokemon/steam-siege-reverse/${source.cardId}`;
  return { ...source, profile: 'swsh-reverse-energy', textured: false,
    treatmentStatus: 'existing-material', deferredEffect: null,
    maps: { foil: `${root}/foil.png`, foilControls: `${root}/foil-controls.png`, roughness: `${root}/roughness.png` },
    evidence: `${root}/evidence.json` };
}
