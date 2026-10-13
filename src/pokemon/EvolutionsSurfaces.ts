import type { tcglXySurfaces } from './data/xy-tcgl.generated.ts';

type Surface = typeof tcglXySurfaces[number];
// English booster standard holo rares, corroborated by the official checklist.
// Explicit identities prevent reverse, product reprints, BREAK/EX/FA/secrets
// from acquiring the hybrid through rarity or a generic Galaxy foil enum.
export const evolutionsHoloNumbers = [11, 15, 25, 34, 36, 38, 42, 45, 53, 59, 62, 63, 70] as const;
const identities = new Set(evolutionsHoloNumbers.map(n => `xy12-${n}:holo`));

export function evolutionsSurface(source: Surface): Surface {
  if (!identities.has(`${source.cardId}:${source.variant}`)) return source;
  const number = source.cardId.slice('xy12-'.length);
  if (source.tcglCardId !== `xy12_${number}` || source.foilType !== 'Galaxy'
    || !source.tcglVariantId.endsWith('_std_RareHolo_Galaxy_Holo')
    || !source.originalAssets.foil || source.originalAssets.etch) {
    throw new Error(`Unreviewed English Evolutions holo printing ${source.tcglVariantId}`);
  }
  const root = `/cards/pokemon/evolutions-holo/${source.cardId}`;
  return { ...source, profile: 'pokemon-evolutions-holo', textured: false,
    treatmentStatus: 'existing-material', deferredEffect: null,
    maps: { foil: `${root}/foil.png`, foilControls: `${root}/foil-controls.png`, motif: `${root}/dots.png`,
      secondaryFoil: `${root}/star-foil.png`, secondaryMotif: `${root}/stars.png` },
    evidence: `${root}/evidence.json` };
}
