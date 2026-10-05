import type { CardDefinition } from '../card/CardDefinition';
import { tcglSvSets } from '../pokemon/data/sv-tcgl.generated.ts';

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

/** English Pokémon release dates for sets represented in the collection. */
const pokemonSetReleaseDates = new Map<string, string>([
  ['Base Set', '1999-01-09'],
  ['Jungle', '1999-06-16'],
  ['Wizards Black Star Promos', '1999-07-01'],
  ['Fossil', '1999-10-10'],
  ['Burger King', '1999-11-15'],
  ['Base Set 2', '2000-02-24'],
  ['Team Rocket', '2000-04-24'],
  ['Gym Heroes', '2000-08-14'],
  ['Gym Challenge', '2000-10-16'],
  ['Neo Genesis', '2000-12-16'],
  ['Neo Discovery', '2001-06-01'],
  ['Southern Islands', '2001-07-31'],
  ['Neo Revelation', '2001-09-21'],
  ['Neo Destiny', '2002-02-28'],
  ['Legendary Collection', '2002-05-24'],
  ['Expedition Base Set', '2002-09-15'],
  ['EX FireRed & LeafGreen', '2004-09-01'],
  ['FireRed & LeafGreen', '2004-09-01'],
  ['Sun & Moon Base', '2017-02-03'],
  ['Sun & Moon', '2017-02-03'],
  ['Vivid Voltage', '2020-11-13'],
  ['Scarlet & Violet', '2023-03-31'],
  ['Paldea Evolved', '2023-06-09'],
  ['151', '2023-09-22'],
  ['Prismatic Evolutions', '2025-01-17'],
  ...tcglSvSets.map(set => [set.name, set.releaseDate] as [string, string]),
]);

/** TCG release dates for the Yu-Gi-Oh! prints in this collection. */
const yugiohSets = [
  ['LOB', 'Legend of Blue Eyes White Dragon', '2002-03-08'],
  ['LDK2', 'Legendary Decks II', '2016-10-06'],
  ['LED6', 'Legendary Duelists: Magical Hero', '2020-01-16'],
  ['IGAS', 'Ignition Assault', '2020-01-30'],
  ['DAMA', 'Dawn of Majesty', '2021-08-12'],
  ['MP22', "2022 Tin of the Pharaoh's Gods", '2022-09-14'],
  ['BLMR', 'Battles of Legend: Monstrous Revenge', '2023-06-22'],
  ['AGOV', 'Age of Overlord', '2023-10-19'],
  ['RA01', '25th Anniversary Rarity Collection', '2023-11-02'],
  ['RA02', '25th Anniversary Rarity Collection II', '2024-05-23'],
  ['INFO', 'The Infinite Forbidden', '2024-07-18'],
  ['MP24', '25th Anniversary Tin: Dueling Mirrors', '2024-09-19'],
  ['ROTA', 'Rage of the Abyss', '2024-10-10'],
  ['RA03', 'Quarter Century Bonanza', '2024-11-07'],
  ['SDWD', 'Structure Deck: Blue-Eyes White Destiny', '2025-02-13'],
  ['DUAD', "Duelist's Advance", '2025-07-03'],
  ['MP25', '2025 Mega-Pack Tin', '2025-09-04'],
  ['BPRO', 'Burst Protocol', '2026-02-05'],
  ['MZMU', 'Maze of Muertos', '2026-02-19'],
  ['RA05', 'Rarity Collection 5', '2026-04-09'],
  ['BLZD', 'Blazing Dominion', '2026-05-07'],
  ['UP01', 'Ultimate Tournament Pack 1', '2026-06-18'],
  ['CORI', 'Chaos Origins', '2026-07-02'],
  ['LAVD', 'Legendary Arc-V Decks', '2026-08-06'],
] as const;
const yugiohSetNames = new Map<string, string>(yugiohSets.map(([code, name]) => [code, name]));
const yugiohSetReleaseDates = new Map<string, string>(yugiohSets.map(([, name, date]) => [name, date]));

/** Scryfall set release dates for Magic printings represented in the gallery. */
const magicSetReleaseDates = new Map<string, string>([
  ['Limited Edition Alpha', '1993-08-05'],
  ['Tempest', '1997-10-14'],
  ['Magic 2011', '2010-07-16'],
  ['Journey into Nyx', '2014-05-02'],
  ['Commander 2021', '2021-04-23'],
  ['Modern Horizons 2', '2021-06-18'],
  ['Kamigawa: Neon Dynasty', '2022-02-18'],
  ['Double Masters 2022', '2022-07-08'],
  ['Dominaria Remastered', '2023-01-13'],
  ['The Lord of the Rings: Tales of Middle-earth', '2023-06-23'],
  ['Commander Masters', '2023-08-04'],
  ['The Lost Caverns of Ixalan', '2023-11-17'],
  ['Murders at Karlov Manor Commander', '2024-02-09'],
  ['Foundations', '2024-11-15'],
  ['Tarkir: Dragonstorm Commander', '2025-04-11'],
  ['Avatar: The Last Airbender Eternal', '2025-11-21'],
  ['Lorwyn Eclipsed Commander', '2026-01-23'],
  ['Teenage Mutant Ninja Turtles Eternal', '2026-03-06'],
  ['Secrets of Strixhaven Commander', '2026-04-24'],
  ['Marvel Super Heroes Commander', '2026-06-26'],
  ['The Hobbit Eternal', '2026-08-14'],
  ['Mystery Booster Commander Edition', '2026-11-09'],
  ['Star Trek', '2026-11-13'],
]);
const gallerySetReleaseDate = (name: string) => pokemonSetReleaseDates.get(name) ?? yugiohSetReleaseDates.get(name) ?? magicSetReleaseDates.get(name);

export function gallerySetName(card: CardDefinition) {
  if (card.franchise === 'Yu-Gi-Oh!') {
    const code = card.number.match(/^([A-Z0-9]+)-(?:EN[A-Z0-9]+|\d{3})$/)?.[1];
    return (code && yugiohSetNames.get(code)) || card.set;
  }
  if (card.franchise === 'Magic: The Gathering') {
    const name = card.set.replace(/ · (?:Nonfoil|Traditional foil|Foil study)$/, '');
    return magicSetReleaseDates.has(name) ? name : card.set;
  }
  if (card.franchise !== 'Pokémon') return card.set;
  return card.pokemon?.setName ?? pokemonSetAliases[card.set] ?? card.set;
}

export function compareGallerySetNames(a: string, b: string) {
  const dateA = gallerySetReleaseDate(a);
  const dateB = gallerySetReleaseDate(b);
  if (dateA || dateB) {
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.localeCompare(dateB) || a.localeCompare(b);
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
  if (a.franchise !== 'Pokémon' && a.franchise !== 'Yu-Gi-Oh!' && a.franchise !== 'Magic: The Gathering') return 0;
  const setOrder = compareGallerySetNames(gallerySetName(a), gallerySetName(b));
  if (setOrder) return setOrder;
  const numberOrder = a.franchise === 'Yu-Gi-Oh!'
    ? a.number.localeCompare(b.number, undefined, { numeric: true })
    : cardNumber(a) - cardNumber(b);
  if (numberOrder) return numberOrder;
  return Number(!!b.pokemon) - Number(!!a.pokemon) || a.id.localeCompare(b.id);
}

export const facets = [
  { key: 'game', label: 'Game', value: (c: CardDefinition) => c.franchise },
  { key: 'set', label: 'Set', value: gallerySetName },
  { key: 'rarity', label: 'Rarity', value: (c: CardDefinition) => c.magic?.rarity ?? c.pokemon?.rarity ?? (c.franchise === 'Yu-Gi-Oh!' ? c.set.match(/^[A-Z0-9]+-EN\d+ · (.+)$/)?.[1] : undefined) },
  { key: 'finish', label: 'Finish', value: (c: CardDefinition) => c.pokemon?.variant ?? (c.construction ? 'Metal' : c.profile === 'print-only' ? 'Non-holo' : c.franchise === 'Pokémon' ? 'holo' : c.profile) },
  { key: 'category', label: 'Category', value: (c: CardDefinition) => c.magic?.typeLine ?? c.pokemon?.category },
] as const;
export type GalleryQuery = { search: string } & Partial<Record<typeof facets[number]['key'], string>>;

function matchesFacet(card: CardDefinition, facet: typeof facets[number], selected: string) {
  const value = facet.value(card);
  if (card.franchise === 'Pokémon' && facet.key === 'finish' && selected === 'holo')
    return value === 'holo' || value === 'reverse' || value === 'pokeball-reverse' || value === 'masterball-reverse';
  return value === selected;
}

export function filterCards(cards: readonly CardDefinition[], query: GalleryQuery) {
  const words = query.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return galleryMasterCards(cards).filter(card => (!card.pickerHidden || card.galleryVisible) && words.every(word => `${card.title} ${gallerySetName(card)} ${card.set} ${card.number}`.toLocaleLowerCase().includes(word))
    && facets.every(facet => !query[facet.key] || matchesFacet(card, facet, query[facet.key]!))).sort(compareGalleryCards);
}

/** Build search text and chronological ordering once per collection revision.
 * Pack pulls/imports can mutate the array, so reference snapshots invalidate it. */
export class GalleryQueryIndex {
  private snapshot: readonly CardDefinition[] = [];
  private indexed: { card: CardDefinition; text: string }[] = [];
  private source: readonly CardDefinition[];
  constructor(source: readonly CardDefinition[]) { this.source = source; }
  private refresh() {
    if (this.snapshot.length === this.source.length && this.source.every((card, index) => card === this.snapshot[index])) return;
    this.snapshot = [...this.source];
    this.indexed = galleryMasterCards(this.source).filter(card => !card.pickerHidden || card.galleryVisible)
      .sort(compareGalleryCards).map(card => ({ card, text: `${card.title} ${gallerySetName(card)} ${card.set} ${card.number}`.toLocaleLowerCase() }));
  }
  cards() { this.refresh(); return this.indexed.map(row => row.card); }
  filter(query: GalleryQuery) {
    this.refresh();
    const words = query.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const selected = facets.filter(facet => query[facet.key]);
    return this.indexed.filter(row => words.every(word => row.text.includes(word))
      && selected.every(facet => matchesFacet(row.card, facet, query[facet.key]!))).map(row => row.card);
  }
}
