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

function pokemonPrintKey(card: CardDefinition) {
  if (card.franchise !== 'Pokémon' || card.imported) return;
  const localId = card.pokemon?.localId ?? card.number.match(/^[^\s/·]+/)?.[0];
  if (!localId) return;
  const number = /^\d+$/.test(localId) ? String(Number(localId)) : localId;
  const variant = card.pokemon?.variant ?? (/reverse/i.test(`${card.set} ${card.number}`) ? 'reverse'
    : card.profile === 'print-only' ? 'normal' : 'holo');
  return `${gallerySetName(card)}|${number}|${variant}`;
}

function printEdition(card: CardDefinition) {
  return card.pokemon?.edition ?? (/\b(?:1st|First) Edition\b/i.test(`${card.set} ${card.number}`) ? 'first-edition' : 'unlimited');
}

function masterPriority(card: CardDefinition) {
  if (card.maps && !card.pokemon) return 5; // Authored standalone surface.
  if (gallerySetName(card) === 'Base Set' && card.id.startsWith('common-pokemon-')) return 4;
  if (card.pokemon) return 3; // Audited set printing over an archive copy.
  if (!card.id.startsWith('common-pokemon-')) return 2;
  return 1;
}

/** Show one master for duplicate assets while retaining distinct print editions and finishes. */
export function galleryMasterCards(cards: readonly CardDefinition[]) {
  const groups = new Map<string, CardDefinition[]>();
  const masters = new Set<CardDefinition>();
  for (const card of cards) {
    const key = pokemonPrintKey(card);
    if (!key) { masters.add(card); continue; }
    const group = groups.get(key) ?? [];
    const duplicate = group.findIndex(existing => printEdition(existing) === printEdition(card)
      || (!!existing.front && existing.front === card.front));
    if (duplicate < 0) group.push(card);
    else if (masterPriority(card) > masterPriority(group[duplicate])) group[duplicate] = card;
    groups.set(key, group);
  }
  for (const group of groups.values()) for (const card of group) masters.add(card);
  return cards.filter(card => masters.has(card));
}

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
  return galleryMasterCards(cards).filter(card => words.every(word => `${card.title} ${gallerySetName(card)} ${card.set} ${card.number}`.toLocaleLowerCase().includes(word))
    && facets.every(facet => !query[facet.key] || facet.value(card) === query[facet.key])).sort(compareGalleryCards);
}
