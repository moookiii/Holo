import type { CardDefinition, CardLayout } from './CardDefinition';

const standard = { width: 6.3, height: 8.8, thickness: 0.032, cornerRadius: 0.3, bevel: 0.007 };
const yugioh = { width: 5.9, height: 8.6, thickness: 0.031, cornerRadius: 0.1, bevel: 0.006 };
const eReaderLayout: CardLayout = { artwork: [55 / 600, 132 / 825, 541 / 600, 444 / 825], innerFrame: [65 / 600, 14 / 825, 585 / 600, 760 / 825] };
const magicLayout: CardLayout = { artwork: [57 / 745, 116 / 1040, 688 / 745, 576 / 1040], innerFrame: [35 / 745, 28 / 1040, 710 / 745, 998 / 1040] };
const yugiohLayout: CardLayout = { artwork: [96 / 813, 205 / 1185, 730 / 813, 848 / 1185], innerFrame: [30 / 813, 28 / 1185, 783 / 813, 1157 / 1185] };

const pokemon = [
  ['dual-ball', 'Dual Ball', '139'], ['energy-removal-2', 'Energy Removal 2', '140'],
  ['energy-restore', 'Energy Restore', '141'], ['master-ball', 'Master Ball', '143'],
  ['pokemon-reversal', 'Pokémon Reversal', '146'], ['power-charge', 'Power Charge', '147'],
] as const;

const yugiohSupers = [
  ['ash-blossom-joyous-spring', 'Ash Blossom & Joyous Spring', '14558127', '25th Anniversary Rarity Collection', 'RA01-EN008'],
  ['nibiru-the-primal-being', 'Nibiru, the Primal Being', '27204311', '25th Anniversary Rarity Collection', 'RA01-EN015'],
  ['forbidden-droplet', 'Forbidden Droplet', '24299458', '25th Anniversary Rarity Collection', 'RA01-EN064'],
  ['triple-tactics-talent', 'Triple Tactics Talent', '25311006', '25th Anniversary Rarity Collection', 'RA01-EN063'],
  ['pot-of-prosperity', 'Pot of Prosperity', '84211599', '25th Anniversary Rarity Collection', 'RA01-EN066'],
  ['evenly-matched', 'Evenly Matched', '15693423', '25th Anniversary Rarity Collection', 'RA01-EN074'],
  ['called-by-the-grave', 'Called by the Grave', '24224830', '25th Anniversary Rarity Collection', 'RA01-EN057'],
  ['lightning-storm', 'Lightning Storm', '14532163', '25th Anniversary Rarity Collection', 'RA01-EN061'],
  ['baronne-de-fleur', 'Baronne de Fleur', '84815190', '25th Anniversary Rarity Collection', 'RA01-EN034'],
  ['droll-lock-bird', 'Droll & Lock Bird', '94145021', '25th Anniversary Rarity Collection II', 'RA02-EN006'],
  ['ghost-belle-haunted-mansion', 'Ghost Belle & Haunted Mansion', '73642296', '25th Anniversary Rarity Collection', 'RA01-EN011'],
  ['ghost-ogre-snow-rabbit', 'Ghost Ogre & Snow Rabbit', '59438930', '25th Anniversary Rarity Collection II', 'RA02-EN009'],
  ['dimension-shifter', 'Dimension Shifter', '91800273', '25th Anniversary Rarity Collection', 'RA01-EN014'],
  ['borreload-savage-dragon', 'Borreload Savage Dragon', '27548199', '25th Anniversary Rarity Collection', 'RA01-EN033'],
  ['apollousa-bow-of-the-goddess', 'Apollousa, Bow of the Goddess', '4280258', '25th Anniversary Rarity Collection II', 'RA02-EN040'],
  ['accesscode-talker', 'Accesscode Talker', '86066372', '25th Anniversary Rarity Collection II', 'RA02-EN044'],
  ['knightmare-unicorn', 'Knightmare Unicorn', '38342335', '25th Anniversary Rarity Collection', 'RA01-EN043'],
  ['underworld-goddess-closed-world', 'Underworld Goddess of the Closed World', '98127546', '25th Anniversary Rarity Collection II', 'RA02-EN045'],
  ['mudragon-of-the-swamp', 'Mudragon of the Swamp', '54757758', '25th Anniversary Rarity Collection', 'RA01-EN028'],
  ['garura-wings-of-resonant-life', 'Garura, Wings of Resonant Life', '11765832', '25th Anniversary Rarity Collection II', 'RA02-EN024'],
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
  ...yugiohSupers.map(([slug, title, passcode, set, number], index) => ({
    id: `holo-yugioh-super-${slug}`, title, franchise: 'Yu-Gi-Oh!' as const,
    set: `${set} · Ultra Rare`, number, dimensions: yugioh,
    front: `/cards/holo-bulk/yugioh/${slug}.jpg`, back: '/cards/yugioh/back-en.png',
    maps: { foil: '/cards/shared/yugioh-standard/artwork.svg?v=4', metallic: `/cards/holo-bulk/yugioh/maps/${slug}-name.png`, height: `/cards/holo-bulk/yugioh/maps/${slug}-height.png`, laminate: '/cards/shared/yugioh-standard/laminate.svg?v=1' },
    mapSettings: { embossStrength: .12 }, layout: yugiohLayout, profile: 'ygo-ultra', seed: 2024000 + index * 97 + Number(passcode) % 997,
    source: { image: `https://images.ygoprodeck.com/images/cards/${passcode}.jpg`, metadata: `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(title)}`, notes: `Clean 813 × 1185 standard-layout front without baked glare. The card_sets record verifies ${number} as Ultra Rare; foil is confined to an inset artwork-window mask and the extracted title mask supplies recessed gold lettering.` },
  })),
  {
    id: 'holo-yugioh-dark-ruler-no-more', title: 'Dark Ruler No More', franchise: 'Yu-Gi-Oh!',
    set: '25th Anniversary Rarity Collection · Ultra Rare', number: 'RA01-EN060', dimensions: yugioh,
    front: '/cards/holo-bulk/yugioh/dark-ruler-no-more.jpg', back: '/cards/yugioh/back-en.png',
    maps: { foil: '/cards/shared/yugioh-standard/artwork.svg?v=4', metallic: '/cards/holo-bulk/yugioh/maps/dark-ruler-no-more-name.png', height: '/cards/holo-bulk/yugioh/maps/dark-ruler-no-more-height.png', laminate: '/cards/shared/yugioh-standard/laminate.svg?v=1' },
    mapSettings: { embossStrength: .12 }, layout: yugiohLayout, profile: 'ygo-ultra', seed: 2023060,
    source: { image: 'https://images.ygoprodeck.com/images/cards/54693926.jpg', metadata: 'https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Dark%20Ruler%20No%20More', notes: 'Clean 813 × 1185 standard-layout front replaces the rejected low-resolution crop. The card_sets record verifies RA01-EN060 as Ultra Rare; foil is confined to the inset artwork window and the title uses recessed gold lettering.' },
  },
  ...magic.map(([slug, title, number, scryfallId], index) => ({
    id: `holo-magic-m11-${slug}`, title, franchise: 'Magic: The Gathering' as const,
    set: 'Magic 2011 · Traditional foil', number, dimensions: standard,
    front: `/cards/holo-bulk/magic/${slug}.png`, back: '/cards/magic/back.png',
    maps: { foil: '/cards/shared/mtg-standard/foil.svg?v=4', laminate: '/cards/shared/mtg-standard/laminate.svg?v=2' },
    layout: magicLayout, profile: 'mtg-traditional', seed: 2011000 + index * 37 + Number(number),
    source: { image: `https://cards.scryfall.io/png/front/${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.png`, metadata: `https://api.scryfall.com/cards/${scryfallId}`, notes: 'Exact Magic 2011 printing. Scryfall lists both nonfoil and foil finishes; the clean same-printing image has no baked foil reflection.' },
  })),
];

export const holoBulkCardIds = holoBulkCards.map(card => card.id);
