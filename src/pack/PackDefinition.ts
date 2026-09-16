import { nonHoloCardIds } from '../card/NonHoloCards.ts';

export interface PackCard {
  cardId: string;
  rarity: 'standard' | 'foil' | 'signature';
  reveal?: 'studio-sweep';
}
export interface PackDefinition {
  id: string;
  name: string;
  category: string;
  cardCount: number;
  seed: number;
  contents: PackCard[];
  order: 'fixed' | 'seeded';
  collation?: { commonSlots: number; commonPool: string[]; holoPool: string[] };
  wrapper: { front: string; back: string; ink: string; backInk?: string; width: number; height: number; depth: number };
}
const archiveWrapper = { front: '/packs/archive/front.svg', back: '/packs/archive/back.svg', ink: '/packs/archive/ink.svg', backInk: '/packs/archive/back-ink.svg', width: 7.55, height: 11.8, depth: .66 };
const holographicCardIds = [
  'nocturne', 'lugia-neo-genesis', 'charizard-base-set', 'tyranitar-paldea-evolved',
  'eevee-legendary-reverse', 'charizard-expedition-reverse', 'squirtle-frlg-reverse',
  'effect-veiler-ra01', 'dark-magician-girl', 'ip-masquerena', 'blue-eyes',
  'angel-of-serenity', 'black-lotus',
];
const archiveCollation = { commonSlots: 4, commonPool: nonHoloCardIds, holoPool: holographicCardIds };

export const showcasePack: PackDefinition = {
  id: 'archive-01', name: 'Archive / 01', category: 'Studio selection', cardCount: 5, seed: 1741,
  order: 'seeded', collation: archiveCollation,
  contents: [
    { cardId: 'tyranitar-paldea-evolved', rarity: 'standard' },
    { cardId: 'squirtle-frlg-reverse', rarity: 'foil' },
    { cardId: 'blue-eyes', rarity: 'foil' },
    { cardId: 'lugia-neo-genesis', rarity: 'foil' },
    { cardId: 'dark-magician-girl', rarity: 'signature', reveal: 'studio-sweep' },
  ],
  wrapper: archiveWrapper,
};

export const archivePack02: PackDefinition = {
  id: 'archive-02', name: 'Archive / 02', category: 'Studio selection', cardCount: 5, seed: 2819,
  order: 'seeded', collation: archiveCollation,
  contents: [
    { cardId: 'charizard-base-set', rarity: 'foil' },
    { cardId: 'eevee-legendary-reverse', rarity: 'standard' },
    { cardId: 'angel-of-serenity', rarity: 'foil' },
    { cardId: 'ip-masquerena', rarity: 'foil' },
    { cardId: 'effect-veiler-ra01', rarity: 'signature', reveal: 'studio-sweep' },
  ],
  wrapper: archiveWrapper,
};

export const archivePack03: PackDefinition = {
  id: 'archive-03', name: 'Archive / 03', category: 'Studio selection', cardCount: 5, seed: 3947,
  order: 'seeded', collation: archiveCollation,
  contents: [
    { cardId: 'black-lotus', rarity: 'signature' },
    { cardId: 'charizard-expedition-reverse', rarity: 'standard' },
    { cardId: 'nocturne', rarity: 'foil' },
    { cardId: 'blue-eyes', rarity: 'foil' },
    { cardId: 'dark-magician-girl', rarity: 'signature', reveal: 'studio-sweep' },
  ],
  wrapper: archiveWrapper,
};

/** Small deterministic fixture for interaction and visual regression checks. */
export const testPack: PackDefinition = {
  id: 'test-pack', name: 'Test / 01', category: 'Development fixture', cardCount: 3, seed: 91,
  order: 'fixed',
  contents: [
    { cardId: 'nocturne', rarity: 'standard' },
    { cardId: 'charizard-base-set', rarity: 'foil' },
    { cardId: 'dark-magician-girl', rarity: 'signature', reveal: 'studio-sweep' },
  ],
  // The fixture intentionally reuses the authored archive wrapper until it has
  // dedicated test artwork; its card contents and timing remain independent.
  wrapper: archiveWrapper,
};

export const packRegistry = [showcasePack, archivePack02, archivePack03, testPack] as const;
export function getPack(id: string) {
  const pack = packRegistry.find(candidate => candidate.id === id);
  if (!pack) throw new Error(`Unknown pack: ${id}`);
  return pack;
}
export function randomSequence(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
export function resolvePackContents(pack: PackDefinition, seed: number) {
  if (!Number.isInteger(pack.cardCount) || pack.cardCount < 1 || pack.cardCount > 12) throw new Error('A pack needs 1–12 defined cards.');
  if (pack.collation) {
    const { commonSlots, commonPool, holoPool } = pack.collation;
    if (commonSlots !== pack.cardCount - 1 || commonPool.length < commonSlots || holoPool.length < 1) throw new Error('Invalid random pack collation.');
    const random = randomSequence(seed);
    const available = [...commonPool];
    const commons: PackCard[] = [];
    for (let slot = 0; slot < commonSlots; slot++) {
      const index = Math.floor(random() * available.length);
      commons.push({ cardId: available.splice(index, 1)[0], rarity: 'standard' });
    }
    const cardId = holoPool[Math.floor(random() * holoPool.length)];
    return [...commons, { cardId, rarity: 'signature' as const, reveal: 'studio-sweep' as const }];
  }
  if (pack.contents.length < pack.cardCount) throw new Error('A pack needs enough defined cards.');
  const contents = pack.contents.map(card => ({ ...card }));
  if (pack.order === 'seeded') {
    const random = randomSequence(seed);
    for (let i = contents.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [contents[i], contents[j]] = [contents[j], contents[i]]; }
  }
  return contents.slice(0, pack.cardCount);
}
