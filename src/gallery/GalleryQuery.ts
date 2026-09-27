import type { CardDefinition } from '../card/CardDefinition';

export const facets = [
  { key: 'game', label: 'Game', value: (c: CardDefinition) => c.franchise },
  { key: 'set', label: 'Set', value: (c: CardDefinition) => c.set },
  { key: 'rarity', label: 'Rarity', value: (c: CardDefinition) => c.pokemon?.rarity },
  { key: 'finish', label: 'Finish', value: (c: CardDefinition) => c.pokemon?.variant ?? (c.construction ? 'Metal' : c.profile === 'print-only' ? 'Non-holo' : c.profile) },
  { key: 'category', label: 'Category', value: (c: CardDefinition) => c.pokemon?.category },
] as const;
export type GalleryQuery = { search: string } & Partial<Record<typeof facets[number]['key'], string>>;
export function filterCards(cards: readonly CardDefinition[], query: GalleryQuery) {
  const words = query.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return cards.filter(card => words.every(word => `${card.title} ${card.set} ${card.number}`.toLocaleLowerCase().includes(word))
    && facets.every(facet => !query[facet.key] || facet.value(card) === query[facet.key]));
}
