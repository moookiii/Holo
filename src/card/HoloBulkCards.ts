import type { CardDefinition, CardLayout } from './CardDefinition';

const standard = { width: 6.3, height: 8.8, thickness: 0.032, cornerRadius: 0.3, bevel: 0.007 };
const yugioh = { width: 5.9, height: 8.6, thickness: 0.031, cornerRadius: 0.1, bevel: 0.006 };
const eReaderLayout: CardLayout = { artwork: [55 / 600, 132 / 825, 541 / 600, 444 / 825], innerFrame: [65 / 600, 14 / 825, 585 / 600, 760 / 825] };
const magicLayout: CardLayout = { artwork: [57 / 745, 116 / 1040, 688 / 745, 576 / 1040], innerFrame: [35 / 745, 28 / 1040, 710 / 745, 998 / 1040] };
const yugiohLayout: CardLayout = { artwork: [20 / 345, 88 / 489, 324 / 345, 359 / 489], innerFrame: [1 / 345, 2 / 489, 344 / 345, 487 / 489] };

const pokemon = [
  ['dual-ball', 'Dual Ball', '139'], ['energy-removal-2', 'Energy Removal 2', '140'],
  ['energy-restore', 'Energy Restore', '141'], ['master-ball', 'Master Ball', '143'],
  ['pokemon-reversal', 'Pokémon Reversal', '146'], ['power-charge', 'Power Charge', '147'],
] as const;

const magic = [
  ['baneslayer-angel', 'Baneslayer Angel', '7', 'ff70c4ff-a241-4333-bd8f-9f0ed5a0333b'],
  ['cultivate', 'Cultivate', '168', '2ef3dbe4-5c03-4be4-ab48-45b6689b6712'],
  ['day-of-judgment', 'Day of Judgment', '12', '03f6b25f-d11c-483a-a3e9-6b801d333482'],
  ['doom-blade', 'Doom Blade', '95', '685a74bb-f158-4d0e-b840-222ecbf107d4'],
  ['duress', 'Duress', '96', '7e1445d6-ae16-492c-a378-d3aa5746c610'],
  ['elvish-archdruid', 'Elvish Archdruid', '171', 'fcb80b4c-35a1-461b-8bad-2679b1dd2e05'],
  ['fauna-shaman', 'Fauna Shaman', '172', 'c685e4c3-eb7b-4b9e-9676-395d69d80974'],
  ['frost-titan', 'Frost Titan', '55', '065addc8-c235-43cc-a54f-b582826e5df1'],
  ['grave-titan', 'Grave Titan', '97', '5fa6d385-6b8e-45ad-83dc-b477799c05a5'],
  ['inferno-titan', 'Inferno Titan', '146', 'f1e4a028-6462-4373-9864-a8adfc78d52b'],
  ['mana-leak', 'Mana Leak', '62', 'a7c7757d-8036-4b33-a1cb-07795d392588'],
  ['nantuko-shade', 'Nantuko Shade', '106', 'bd01bab0-3241-4ebb-a378-f88cbdf16dc3'],
  ['negate', 'Negate', '68', 'ae89bd67-3c72-449f-be72-d04bb7cca916'],
  ['obstinate-baloth', 'Obstinate Baloth', '188', '6694496c-45b9-4ddf-bfcd-b632441b8811'],
  ['preordain', 'Preordain', '70', 'e3868c3d-4fcd-444b-866f-0f8e50ce7b67'],
  ['primeval-titan', 'Primeval Titan', '192', 'feee9327-b937-46ba-a2aa-6c015ab6cdd5'],
  ['reassembling-skeleton', 'Reassembling Skeleton', '112', 'a2ec6120-2de0-4166-be85-2d773fa7ebbb'],
] as const;

export const holoBulkCards: CardDefinition[] = [
  ...pokemon.map(([slug, title, number], index) => ({
    id: `holo-pokemon-expedition-${slug}`, title, franchise: 'Pokémon' as const,
    set: 'Expedition Base Set · Reverse Holo', number: `${number}/165`, dimensions: standard,
    front: `/cards/holo-bulk/pokemon/${slug}.png`, back: '/cards/pokemon/back.jpg',
    maps: { reverseFoil: '/cards/shared/pokemon-ereader-trainer/reverse.svg?v=1', laminate: '/cards/shared/pokemon-ereader-trainer/laminate.svg?v=1' },
    coverageMode: 'reverse' as const, layout: eReaderLayout, profile: 'pokemon-e-reader', seed: 2002139 + index * 31,
    source: { image: `https://images.pokemontcg.io/ecard1/${number}_hires.png`, metadata: `https://api.tcgdex.net/v2/en/cards/ecard1-${number}`, notes: 'Exact clean Expedition front. TCGdex records both normal and reverse variants; the shared mask foils the printed silver body while protecting artwork and e-reader rails.' },
  })),
  {
    id: 'holo-yugioh-dark-ruler-no-more', title: 'Dark Ruler No More', franchise: 'Yu-Gi-Oh!',
    set: '25th Anniversary Rarity Collection · Super Rare', number: 'RA01-EN060', dimensions: yugioh,
    front: '/cards/holo-bulk/yugioh/dark-ruler-no-more.png', back: '/cards/yugioh/back-en.png',
    maps: { foil: '/cards/shared/yugioh-standard/artwork.svg?v=2', laminate: '/cards/shared/yugioh-standard/laminate.svg?v=1' },
    layout: yugiohLayout, profile: 'ygo-super', seed: 2023060,
    source: { image: 'https://cdn11.bigcommerce.com/s-b4ioc4fed9/images/stencil/original/products/374153/2988372/mkbpCyClkUDMGmbLSkrfRUpoS__27229.1765489051.png', metadata: 'https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Dark%20Ruler%20No%20More', notes: 'Clean SDCH-EN027 Common scan supplies the same artwork and standard Spell layout without foil glare. The card_sets record verifies RA01-EN060 as Super Rare.' },
  },
  ...magic.map(([slug, title, number, scryfallId], index) => ({
    id: `holo-magic-m11-${slug}`, title, franchise: 'Magic: The Gathering' as const,
    set: 'Magic 2011 · Traditional foil', number, dimensions: standard,
    front: `/cards/holo-bulk/magic/${slug}.png`, back: '/cards/magic/back.png',
    maps: { foil: '/cards/shared/mtg-standard/foil.svg?v=2', laminate: '/cards/shared/mtg-standard/laminate.svg?v=1' },
    layout: magicLayout, profile: 'mtg-traditional', seed: 2011000 + index * 37 + Number(number),
    source: { image: `https://cards.scryfall.io/png/front/${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.png`, metadata: `https://api.scryfall.com/cards/${scryfallId}`, notes: 'Exact Magic 2011 printing. Scryfall lists both nonfoil and foil finishes; the clean same-printing image has no baked foil reflection.' },
  })),
];
