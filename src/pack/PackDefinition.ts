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
  wrapper: { front: string; back: string; ink: string; width: number; height: number; depth: number };
}
export const showcasePack: PackDefinition = {
  id: 'archive-01', name: 'Archive / 01', category: 'Studio selection', cardCount: 5, seed: 1741,
  order: 'fixed',
  contents: [
    { cardId: 'tyranitar-paldea-evolved', rarity: 'standard' },
    { cardId: 'squirtle-frlg-reverse', rarity: 'foil' },
    { cardId: 'blue-eyes', rarity: 'foil' },
    { cardId: 'lugia-neo-genesis', rarity: 'foil' },
    { cardId: 'dark-magician-girl', rarity: 'signature', reveal: 'studio-sweep' },
  ],
  wrapper: { front: '/packs/archive/front.svg', back: '/packs/archive/back.svg', ink: '/packs/archive/ink.svg', width: 7.55, height: 11.8, depth: .66 },
};
export function randomSequence(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
export function resolvePackContents(pack: PackDefinition, seed: number) {
  if (!Number.isInteger(pack.cardCount) || pack.cardCount < 1 || pack.cardCount > 12 || pack.contents.length < pack.cardCount) throw new Error('A pack needs 1–12 defined cards.');
  const contents = pack.contents.map(card => ({ ...card }));
  if (pack.order === 'seeded') {
    const random = randomSequence(seed);
    for (let i = contents.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [contents[i], contents[j]] = [contents[j], contents[i]]; }
  }
  return contents.slice(0, pack.cardCount);
}
