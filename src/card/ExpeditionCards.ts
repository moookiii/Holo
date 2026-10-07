import type { CardDefinition } from './CardDefinition.ts';
import { expeditionCards } from '../pokemon/ExpeditionCatalog.ts';

const dimensions = { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 };
const base = '/cards/pokemon/expedition/maps';
const legacyTrainers: Readonly<Record<number, { slug: string; index: number }>> = {
  139: { slug: 'dual-ball', index: 0 }, 140: { slug: 'energy-removal-2', index: 1 },
  141: { slug: 'energy-restore', index: 2 }, 143: { slug: 'master-ball', index: 3 },
  146: { slug: 'pokemon-reversal', index: 4 }, 147: { slug: 'power-charge', index: 5 },
};
/** Regular holos reuse the established Cosmos optics with per-master PNG motifs. */
export const expeditionDefinitions: CardDefinition[] = expeditionCards.flatMap(card => card.variants.map(variant => {
  const n = Number(card.localId), legacy = variant === 'reverse' ? legacyTrainers[n] : undefined;
  const charizard = n === 40 && variant === 'reverse';
  const cleanReverse = n <= 32 && variant === 'reverse';
  const profile = variant === 'reverse' ? 'pokemon-e-reader' : variant === 'holo' ? 'pokemon-base-set-2-cosmos' : 'print-only';
  return {
    id: charizard ? 'charizard-expedition-reverse' : legacy ? `holo-pokemon-expedition-${legacy.slug}` : `pokemon:${card.id}:${variant}`,
    title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${n}/165 · ${variant === 'holo' ? 'Holo' : variant === 'reverse' ? 'Reverse holo' : 'Non-holo'}`,
    dimensions, physicalProfile: 'pokemon',
    front: cleanReverse ? `/cards/pokemon/expedition/${n}-reverse.png` : charizard ? '/cards/charizard-expedition-reverse/front.png' : legacy ? `/cards/holo-bulk/pokemon/${legacy.slug}.png` : card.front!,
    back: '/cards/pokemon/back.jpg', profile,
    seed: charizard ? 2002040 : legacy ? 2002139 + legacy.index*31 : 2002000+n,
    ...(variant === 'holo' ? { maps: { motif: `${base}/${n}-cosmos.png`, foil: `${base}/${n}-holo-window.png`, protection: `${base}/${n}-holo-protection.png` },
      mapSettings: { embossStrength: 0 }, substrate: { color: [0, 0, 0] as [number, number, number], printRetention: 1 } } : variant === 'reverse' ? {
      coverageMode: 'reverse' as const,
      maps: charizard ? { reverseFoil: `${base}/40-legacy-reverse.png`,
        protection: '/cards/charizard-expedition-reverse/protection.png', laminate: `${base}/40-legacy-laminate.png` }
        : legacy ? { reverseFoil: `${base}/${n}-reverse.png`, laminate: `${base}/trainer-legacy-laminate.png` }
        : { reverseFoil: `${base}/${n}-reverse.png` },
    } : {}),
    layout: charizard ? { artwork: [54/600,93/825,580/600,400/825], innerFrame: [52/600,18/825,582/600,777/825] }
      : legacy ? { artwork: [55/600,132/825,541/600,444/825], innerFrame: [65/600,14/825,585/600,760/825] }
      : { artwork: card.category === 'Pokemon' ? [58/600,98/825,580/600,403/825]
        : card.category === 'Trainer' ? [58/600,130/825,580/600,443/825] : [58/600,100/825,580/600,480/825],
        innerFrame: [0,0,1,1] },
    pokemon: { ...card, variant, materialProfile: profile },
    source: { image: cleanReverse ? `/cards/pokemon/expedition/${n}-reverse.png` : `https://assets.tcgdex.net/en/ecard/ecard1/${n}/high.png`,
      metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: variant === 'holo' ? 'Unchanged exact English holo master, supplied SAM protection and registered Cosmos PNG motifs. Existing Base Set 2 optical response; no etched relief. Full e-Reader rails retained. See docs/expedition.md.'
        : cleanReverse ? 'Exact Holo Rare numbered frame and e-Reader details; registered matching non-holo Expedition artwork removes scanned regular foil. See reverse-front-evidence.json and docs/expedition-clean-masters.md.'
        : variant === 'reverse' ? 'Existing Expedition e-reader response; PNG coverage. Exact-number front retained.'
        : 'Unmodified exact English numbered front; full e-Reader geometry retained.' },
  } satisfies CardDefinition;
}));
