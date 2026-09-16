import type { CardDefinition, CardDimensions } from './CardDefinition';

const standard: CardDimensions = { width: 6.3, height: 8.8, thickness: 0.032, cornerRadius: 0.3, bevel: 0.007 };
const yugiohSize: CardDimensions = { width: 5.9, height: 8.6, thickness: 0.031, cornerRadius: 0.1, bevel: 0.006 };

const pokemon = [
  ['bulbasaur', 'Bulbasaur', '44/102'], ['charmander', 'Charmander', '46/102'],
  ['diglett', 'Diglett', '47/102'], ['drowzee', 'Drowzee', '49/102'],
  ['gastly', 'Gastly', '50/102'], ['koffing', 'Koffing', '51/102'],
  ['machop', 'Machop', '52/102'], ['metapod', 'Metapod', '54/102'],
  ['nidoran-m', 'Nidoran ♂', '55/102'], ['onix', 'Onix', '56/102'],
  ['pikachu', 'Pikachu', '58/102'], ['poliwag', 'Poliwag', '59/102'],
  ['ponyta', 'Ponyta', '60/102'], ['sandshrew', 'Sandshrew', '62/102'],
  ['squirtle', 'Squirtle', '63/102'], ['staryu', 'Staryu', '65/102'],
  ['voltorb', 'Voltorb', '67/102'], ['weedle', 'Weedle', '69/102'],
] as const;

const yugioh = [
  ['kuriboh', 'Kuriboh'], ['mystical-elf', 'Mystical Elf'],
  ['celtic-guardian', 'Celtic Guardian'], ['giant-soldier-of-stone', 'Giant Soldier of Stone'],
  ['battle-ox', 'Battle Ox'], ['skull-servant', 'Skull Servant'],
  ['feral-imp', 'Feral Imp'], ['beaver-warrior', 'Beaver Warrior'],
  ['mystic-horseman', 'Mystic Horseman'], ['silver-fang', 'Silver Fang'],
  ['winged-dragon-guardian-of-the-fortress-1', 'Winged Dragon, Guardian of the Fortress #1'],
  ['la-jinn-the-mystical-genie-of-the-lamp', 'La Jinn the Mystical Genie of the Lamp'],
  ['summoned-skull', 'Summoned Skull'], ['sangan', 'Sangan'],
  ['man-eater-bug', 'Man-Eater Bug'], ['trap-hole', 'Trap Hole'],
] as const;

const magic = [
  ['llanowar-elves', 'Llanowar Elves'], ['lightning-bolt', 'Lightning Bolt'],
  ['counterspell', 'Counterspell'], ['dark-ritual', 'Dark Ritual'],
  ['giant-growth', 'Giant Growth'], ['disenchant', 'Disenchant'],
  ['grizzly-bears', 'Grizzly Bears'], ['serra-angel', 'Serra Angel'],
  ['shivan-dragon', 'Shivan Dragon'], ['air-elemental', 'Air Elemental'],
  ['terror', 'Terror'], ['unsummon', 'Unsummon'],
  ['stone-rain', 'Stone Rain'], ['raise-dead', 'Raise Dead'],
  ['pacifism', 'Pacifism'], ['birds-of-paradise', 'Birds of Paradise'],
] as const;

export const nonHoloCards: CardDefinition[] = [
  ...pokemon.map(([slug, title, number], index) => ({
    id: `common-pokemon-${slug}`, title, franchise: 'Pokémon' as const,
    set: 'Base Set · Non-holo', number, dimensions: standard,
    front: `/cards/non-holo/pokemon/${slug}.png`, back: '/cards/pokemon/back.jpg',
    profile: 'print-only', seed: 6100 + index,
  })),
  ...yugioh.map(([slug, title], index) => ({
    id: `common-yugioh-${slug}`, title, franchise: 'Yu-Gi-Oh!' as const,
    set: 'Archive common', number: `${index + 1}/16`, dimensions: yugiohSize,
    front: `/cards/non-holo/yugioh/${slug}.jpg`, back: '/cards/yugioh/back-en.png',
    profile: 'print-only', seed: 6200 + index,
  })),
  ...magic.map(([slug, title], index) => ({
    id: `common-magic-${slug}`, title, franchise: 'Magic: The Gathering' as const,
    set: 'Archive non-foil', number: `${index + 1}/16`, dimensions: standard,
    front: `/cards/non-holo/magic/${slug}.jpg`, back: '/cards/magic/back.png',
    profile: 'print-only', seed: 6300 + index,
  })),
];

export const nonHoloCardIds = nonHoloCards.map(card => card.id);
