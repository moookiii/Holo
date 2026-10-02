import type { CardDefinition } from '../card/CardDefinition';

const pokemonSetAliases: Readonly<Record<string, string>> = {
  'Base Set · First Edition': 'Base Set',
  'Base Set · Non-holo': 'Base Set',
  'Burger King · 1999 gold-plated collectible': 'Burger King',
  'EX FireRed & LeafGreen · Reverse holo': 'EX FireRed & LeafGreen',
  'Expedition · Reverse holo': 'Expedition Base Set',
  'Expedition Base Set · Reverse Holo': 'Expedition Base Set',
  'Legendary Collection · Reverse holo': 'Legendary Collection',
  'Neo Genesis · First Edition': 'Neo Genesis',
  'Scarlet & Violet · Common': 'Scarlet & Violet',
  'Scarlet & Violet · Uncommon': 'Scarlet & Violet',
  'Sun & Moon Base · Rainbow Secret Rare': 'Sun & Moon Base',
  'Vivid Voltage · Rainbow Rare': 'Vivid Voltage',
};

/** English Pokémon release order for sets represented in the collection. */
const pokemonSetReleaseOrder = [
  'Base Set',
  'Jungle',
  'Fossil',
  'Burger King',
  'Base Set 2',
  'Team Rocket',
  'Gym Heroes',
  'Gym Challenge',
  'Neo Genesis',
  'Legendary Collection',
  'Expedition Base Set',
  'EX FireRed & LeafGreen',
  'Sun & Moon Base',
  'Vivid Voltage',
  'Scarlet & Violet',
  'Paldea Evolved',
  'Prismatic Evolutions',
];
const pokemonSetReleaseRank = new Map(pokemonSetReleaseOrder.map((name, index) => [name, index]));

export function gallerySetName(card: CardDefinition) {
  if (card.franchise !== 'Pokémon') return card.set;
  return card.pokemon?.setName ?? pokemonSetAliases[card.set] ?? card.set;
}

export function compareGallerySetNames(a: string, b: string) {
  const rankA = pokemonSetReleaseRank.get(a), rankB = pokemonSetReleaseRank.get(b);
  if (rankA !== undefined || rankB !== undefined) {
    if (rankA === undefined) return 1;
    if (rankB === undefined) return -1;
    if (rankA !== rankB) return rankA - rankB;
  }
  return a.localeCompare(b);
}

const franchiseOrder: Readonly<Record<CardDefinition['franchise'], number>> = {
  'Pokémon': 0, 'Yu-Gi-Oh!': 1, 'Magic: The Gathering': 2, 'Original': 3,
};
const cardNumber = (card: CardDefinition) => Number.parseInt(card.pokemon?.localId ?? card.number, 10) || Number.POSITIVE_INFINITY;

function compareGalleryCards(a: CardDefinition, b: CardDefinition) {
  const gameOrder = franchiseOrder[a.franchise] - franchiseOrder[b.franchise];
  if (gameOrder) return gameOrder;
  if (a.franchise !== 'Pokémon') return 0;
  const setOrder = compareGallerySetNames(gallerySetName(a), gallerySetName(b));
  if (setOrder) return setOrder;
  const numberOrder = cardNumber(a) - cardNumber(b);
  if (numberOrder) return numberOrder;
  return Number(!!b.pokemon) - Number(!!a.pokemon) || a.id.localeCompare(b.id);
}

export const facets = [
  { key: 'game', label: 'Game', value: (c: CardDefinition) => c.franchise },
  { key: 'set', label: 'Set', value: gallerySetName },
  { key: 'rarity', label: 'Rarity', value: (c: CardDefinition) => c.pokemon?.rarity },
  { key: 'finish', label: 'Finish', value: (c: CardDefinition) => c.pokemon?.variant ?? (c.construction ? 'Metal' : c.profile === 'print-only' ? 'Non-holo' : c.profile) },
  { key: 'category', label: 'Category', value: (c: CardDefinition) => c.pokemon?.category },
] as const;
export type GalleryQuery = { search: string } & Partial<Record<typeof facets[number]['key'], string>>;
export function filterCards(cards: readonly CardDefinition[], query: GalleryQuery) {
  const words = query.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return cards.filter(card => words.every(word => `${card.title} ${gallerySetName(card)} ${card.set} ${card.number}`.toLocaleLowerCase().includes(word))
    && facets.every(facet => !query[facet.key] || facet.value(card) === query[facet.key])).sort(compareGalleryCards);
}
