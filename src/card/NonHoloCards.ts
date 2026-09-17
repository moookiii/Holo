import type { CardDefinition, CardDimensions } from './CardDefinition';

const standard: CardDimensions = { width: 6.3, height: 8.8, thickness: 0.032, cornerRadius: 0.3, bevel: 0.007 };
const yugiohSize: CardDimensions = { width: 5.9, height: 8.6, thickness: 0.031, cornerRadius: 0.1, bevel: 0.006 };

const pokemon = [
  ['bulbasaur', 'Bulbasaur', '44/102'], ['charmander', 'Charmander', '46/102'], ['diglett', 'Diglett', '47/102'], ['drowzee', 'Drowzee', '49/102'],
  ['gastly', 'Gastly', '50/102'], ['koffing', 'Koffing', '51/102'], ['machop', 'Machop', '52/102'], ['metapod', 'Metapod', '54/102'],
  ['nidoran-m', 'Nidoran ♂', '55/102'], ['onix', 'Onix', '56/102'], ['pikachu', 'Pikachu', '58/102'], ['poliwag', 'Poliwag', '59/102'],
  ['ponyta', 'Ponyta', '60/102'], ['sandshrew', 'Sandshrew', '62/102'], ['squirtle', 'Squirtle', '63/102'], ['staryu', 'Staryu', '65/102'],
  ['voltorb', 'Voltorb', '67/102'], ['weedle', 'Weedle', '69/102'],
  ['butterfree', 'Butterfree', '33/Jungle'], ['dodrio', 'Dodrio', '34/Jungle'], ['gloom', 'Gloom', '35/Jungle'], ['lickitung', 'Lickitung', '36/Jungle'],
  ['marowak', 'Marowak', '37/Jungle'], ['nidorina', 'Nidorina', '38/Jungle'], ['parasect', 'Parasect', '39/Jungle'], ['persian', 'Persian', '40/Jungle'],
  ['primeape', 'Primeape', '41/Jungle'], ['rapidash', 'Rapidash', '42/Jungle'], ['rhydon', 'Rhydon', '43/Jungle'], ['seaking', 'Seaking', '44/Jungle'],
  ['tauros', 'Tauros', '45/Jungle'], ['weepinbell', 'Weepinbell', '46/Jungle'], ['bellsprout', 'Bellsprout', '47/Jungle'], ['cubone', 'Cubone', '48/Jungle'],
  ['eevee', 'Eevee', '49/Jungle'], ['exeggcute', 'Exeggcute', '50/Jungle'], ['goldeen', 'Goldeen', '51/Jungle'], ['jigglypuff', 'Jigglypuff', '52/Jungle'],
  ['mankey', 'Mankey', '53/Jungle'], ['meowth', 'Meowth', '54/Jungle'], ['nidoran-f', 'Nidoran ♀', '55/Jungle'], ['oddish', 'Oddish', '56/Jungle'],
  ['rhyhorn', 'Rhyhorn', '58/Jungle'], ['spearow', 'Spearow', '59/Jungle'], ['venonat', 'Venonat', '60/Jungle'],
  ['geodude', 'Geodude', 'Fossil'], ['golbat', 'Golbat', 'Fossil'], ['golduck', 'Golduck', 'Fossil'], ['grimer', 'Grimer', 'Fossil'],
  ['kabuto', 'Kabuto', 'Fossil'], ['krabby', 'Krabby', 'Fossil'], ['omanyte', 'Omanyte', 'Fossil'],
] as const;

const yugioh = [
  ['kuriboh', 'Kuriboh'], ['mystical-elf', 'Mystical Elf'], ['celtic-guardian', 'Celtic Guardian'], ['giant-soldier-of-stone', 'Giant Soldier of Stone'],
  ['battle-ox', 'Battle Ox'], ['skull-servant', 'Skull Servant'], ['feral-imp', 'Feral Imp'], ['beaver-warrior', 'Beaver Warrior'],
  ['mystic-horseman', 'Mystic Horseman'], ['silver-fang', 'Silver Fang'], ['winged-dragon-guardian-of-the-fortress-1', 'Winged Dragon, Guardian of the Fortress #1'],
  ['la-jinn-the-mystical-genie-of-the-lamp', 'La Jinn the Mystical Genie of the Lamp'], ['summoned-skull', 'Summoned Skull'], ['sangan', 'Sangan'],
  ['man-eater-bug', 'Man-Eater Bug'], ['trap-hole', 'Trap Hole'],
  ['dark-magician', 'Dark Magician'], ['red-eyes-b-black-dragon', 'Red-Eyes B. Dragon'], ['gaia-the-fierce-knight', 'Gaia The Fierce Knight'],
  ['curse-of-dragon', 'Curse of Dragon'], ['baby-dragon', 'Baby Dragon'], ['time-wizard', 'Time Wizard'], ['flame-swordsman', 'Flame Swordsman'],
  ['polymerization', 'Polymerization'], ['monster-reborn', 'Monster Reborn'], ['raigeki', 'Raigeki'], ['harpie-lady', 'Harpie Lady'], ['jinzo', 'Jinzo'],
  ['buster-blader', 'Buster Blader'], ['thousand-eyes-restrict', 'Thousand-Eyes Restrict'], ['black-luster-soldier', 'Black Luster Soldier'],
  ['exodia-the-forbidden-one', 'Exodia the Forbidden One'], ['left-arm-of-the-forbidden-one', 'Left Arm of the Forbidden One'],
  ['right-arm-of-the-forbidden-one', 'Right Arm of the Forbidden One'], ['left-leg-of-the-forbidden-one', 'Left Leg of the Forbidden One'],
  ['right-leg-of-the-forbidden-one', 'Right Leg of the Forbidden One'], ['mirror-force', 'Mirror Force'], ['magic-cylinder', 'Magic Cylinder'],
  ['torrential-tribute', 'Torrential Tribute'], ['mystical-space-typhoon', 'Mystical Space Typhoon'], ['book-of-moon', 'Book of Moon'],
  ['premature-burial', 'Premature Burial'], ['call-of-the-haunted', 'Call of the Haunted'], ['pot-of-greed', 'Pot of Greed'],
  ['graceful-charity', 'Graceful Charity'], ['snatch-steal', 'Snatch Steal'], ['change-of-heart', 'Change of Heart'],
  ['the-winged-dragon-of-ra', 'The Winged Dragon of Ra'], ['slifer-the-sky-dragon', 'Slifer the Sky Dragon'],
] as const;

const magic = [
  ['llanowar-elves', 'Llanowar Elves'], ['lightning-bolt', 'Lightning Bolt'], ['counterspell', 'Counterspell'], ['dark-ritual', 'Dark Ritual'],
  ['giant-growth', 'Giant Growth'], ['disenchant', 'Disenchant'], ['grizzly-bears', 'Grizzly Bears'], ['serra-angel', 'Serra Angel'],
  ['shivan-dragon', 'Shivan Dragon'], ['air-elemental', 'Air Elemental'], ['terror', 'Terror'], ['unsummon', 'Unsummon'],
  ['stone-rain', 'Stone Rain'], ['raise-dead', 'Raise Dead'], ['pacifism', 'Pacifism'], ['birds-of-paradise', 'Birds of Paradise'],
  ['ancestral-recall', 'Ancestral Recall'], ['armageddon', 'Armageddon'], ['balance', 'Balance'], ['basalt-monolith', 'Basalt Monolith'],
  ['black-knight', 'Black Knight'], ['boomerang', 'Boomerang'], ['circle-of-protection-red', 'Circle of Protection: Red'], ['clone', 'Clone'],
  ['disrupting-scepter', 'Disrupting Scepter'], ['earthquake', 'Earthquake'], ['elvish-archers', 'Elvish Archers'], ['fireball', 'Fireball'],
  ['force-spike', 'Force Spike'], ['frozen-shade', 'Frozen Shade'], ['goblin-king', 'Goblin King'], ['howling-mine', 'Howling Mine'],
  ['icy-manipulator', 'Icy Manipulator'], ['island', 'Island'], ['jade-statue', 'Jade Statue'], ['jayemdae-tome', 'Jayemdae Tome'],
  ['meekstone', 'Meekstone'], ['mox-emerald', 'Mox Emerald'], ['mox-jet', 'Mox Jet'], ['mox-pearl', 'Mox Pearl'], ['mox-ruby', 'Mox Ruby'],
  ['mox-sapphire', 'Mox Sapphire'], ['nevinyrrals-disk', "Nevinyrral's Disk"], ['royal-assassin', 'Royal Assassin'], ['sengir-vampire', 'Sengir Vampire'],
  ['savannah-lions', 'Savannah Lions'], ['sol-ring', 'Sol Ring'], ['stasis', 'Stasis'], ['white-knight', 'White Knight'],
] as const;

export const nonHoloCards: CardDefinition[] = [
  ...pokemon.map(([slug, title, number], index) => ({
    id: `common-pokemon-${slug}`, title, franchise: 'Pokémon' as const,
    set: 'Base Set · Non-holo', number, dimensions: standard,
    front: `/cards/non-holo/pokemon/${slug}.png`, back: '/cards/pokemon/back.jpg', profile: 'print-only', seed: 6100 + index,
  })),
  ...yugioh.map(([slug, title], index) => ({
    id: `common-yugioh-${slug}`, title, franchise: 'Yu-Gi-Oh!' as const,
    set: 'Archive common', number: `${index + 1}/49`, dimensions: yugiohSize,
    front: `/cards/non-holo/yugioh/${slug}.jpg`, back: '/cards/yugioh/back-en.png', profile: 'print-only', seed: 6200 + index,
  })),
  ...magic.map(([slug, title], index) => ({
    id: `common-magic-${slug}`, title, franchise: 'Magic: The Gathering' as const,
    set: 'Archive non-foil', number: `${index + 1}/49`, dimensions: standard,
    front: `/cards/non-holo/magic/${slug}.jpg`, back: '/cards/magic/back.png', profile: 'print-only', seed: 6300 + index,
  })),
];

export const nonHoloCardIds = nonHoloCards.map(card => card.id);
export const newNonHoloCards = nonHoloCards.filter(card => card.seed >= 6118);
