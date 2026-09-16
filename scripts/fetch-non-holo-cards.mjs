import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/cards/non-holo');
const headers = { 'User-Agent': 'HoloArchive/1.0 (local interactive card viewer)', Accept: 'application/json' };
const pokemon = [
  ['beedrill', 'Beedrill', 17], ['dragonair', 'Dragonair', 18], ['dugtrio', 'Dugtrio', 19], ['electabuzz', 'Electabuzz', 20],
  ['electrode', 'Electrode', 21], ['pidgeotto', 'Pidgeotto', 22], ['arcanine', 'Arcanine', 23], ['charmeleon', 'Charmeleon', 24],
  ['dewgong', 'Dewgong', 25], ['dratini', 'Dratini', 26], ['farfetchd', "Farfetch'd", 27], ['growlithe', 'Growlithe', 28],
  ['haunter', 'Haunter', 29], ['ivysaur', 'Ivysaur', 30], ['jynx', 'Jynx', 31], ['kadabra', 'Kadabra', 32],
  ['kakuna', 'Kakuna', 33], ['machoke', 'Machoke', 34], ['magikarp', 'Magikarp', 35], ['magmar', 'Magmar', 36],
  ['nidorino', 'Nidorino', 37], ['poliwhirl', 'Poliwhirl', 38], ['porygon', 'Porygon', 39], ['raticate', 'Raticate', 40],
  ['seel', 'Seel', 41], ['wartortle', 'Wartortle', 42], ['abra', 'Abra', 43], ['caterpie', 'Caterpie', 45],
  ['doduo', 'Doduo', 48], ['magnemite', 'Magnemite', 53], ['paras', 'Paras', 57], ['rattata', 'Rattata', 61],
  ['starmie', 'Starmie', 64], ['tangela', 'Tangela', 66],
];
const yugioh = [
  ['dark-magician', 'Dark Magician'], ['red-eyes-b-black-dragon', 'Red-Eyes B. Dragon'], ['gaia-the-fierce-knight', 'Gaia The Fierce Knight'],
  ['curse-of-dragon', 'Curse of Dragon'], ['baby-dragon', 'Baby Dragon'], ['time-wizard', 'Time Wizard'], ['flame-swordsman', 'Flame Swordsman'],
  ['polymerization', 'Polymerization'], ['monster-reborn', 'Monster Reborn'], ['raigeki', 'Raigeki'], ['harpie-lady', 'Harpie Lady'],
  ['jinzo', 'Jinzo'], ['buster-blader', 'Buster Blader'], ['thousand-eyes-restrict', 'Thousand-Eyes Restrict'],
  ['black-luster-soldier', 'Black Luster Soldier'], ['exodia-the-forbidden-one', 'Exodia the Forbidden One'],
  ['left-arm-of-the-forbidden-one', 'Left Arm of the Forbidden One'], ['right-arm-of-the-forbidden-one', 'Right Arm of the Forbidden One'],
  ['left-leg-of-the-forbidden-one', 'Left Leg of the Forbidden One'], ['right-leg-of-the-forbidden-one', 'Right Leg of the Forbidden One'],
  ['mirror-force', 'Mirror Force'], ['magic-cylinder', 'Magic Cylinder'], ['torrential-tribute', 'Torrential Tribute'],
  ['mystical-space-typhoon', 'Mystical Space Typhoon'], ['book-of-moon', 'Book of Moon'], ['premature-burial', 'Premature Burial'],
  ['call-of-the-haunted', 'Call of the Haunted'], ['pot-of-greed', 'Pot of Greed'], ['graceful-charity', 'Graceful Charity'],
  ['snatch-steal', 'Snatch Steal'], ['change-of-heart', 'Change of Heart'], ['the-winged-dragon-of-ra', 'The Winged Dragon of Ra'],
  ['slifer-the-sky-dragon', 'Slifer the Sky Dragon'],
];
const magic = [
  ['ancestral-recall', 'Ancestral Recall'], ['armageddon', 'Armageddon'], ['balance', 'Balance'], ['basalt-monolith', 'Basalt Monolith'],
  ['black-knight', 'Black Knight'], ['boomerang', 'Boomerang'], ['circle-of-protection-red', 'Circle of Protection: Red'], ['clone', 'Clone'],
  ['disrupting-scepter', 'Disrupting Scepter'], ['earthquake', 'Earthquake'], ['elvish-archers', 'Elvish Archers'], ['fireball', 'Fireball'],
  ['force-spike', 'Force Spike'], ['frozen-shade', 'Frozen Shade'], ['goblin-king', 'Goblin King'], ['howling-mine', 'Howling Mine'],
  ['icy-manipulator', 'Icy Manipulator'], ['island', 'Island'], ['jade-statue', 'Jade Statue'], ['jayemdae-tome', 'Jayemdae Tome'],
  ['meekstone', 'Meekstone'], ['mox-emerald', 'Mox Emerald'], ['mox-jet', 'Mox Jet'], ['mox-pearl', 'Mox Pearl'],
  ['mox-ruby', 'Mox Ruby'], ['mox-sapphire', 'Mox Sapphire'], ['nevinyrrals-disk', "Nevinyrral's Disk"], ['royal-assassin', 'Royal Assassin'],
  ['sengir-vampire', 'Sengir Vampire'], ['savannah-lions', 'Savannah Lions'], ['sol-ring', 'Sol Ring'], ['stasis', 'Stasis'],
  ['white-knight', 'White Knight'],
];

async function json(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}
async function image(url, destination) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

const provenance = [];
for (const family of ['pokemon', 'yugioh', 'magic']) await mkdir(path.join(root, family), { recursive: true });
for (const [slug, title, number] of pokemon) {
  const url = `https://images.pokemontcg.io/base1/${number}_hires.png`;
  await image(url, path.join(root, 'pokemon', `${slug}.png`));
  provenance.push({ franchise: 'Pokémon', slug, title, source: url, card: `base1/${number}` });
}
for (const [slug, name] of yugioh) {
  const result = await json(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(name)}`);
  const card = result.data[0], url = card.card_images[0].image_url;
  await image(url, path.join(root, 'yugioh', `${slug}.jpg`));
  provenance.push({ franchise: 'Yu-Gi-Oh!', slug, title: name, source: url, card: String(card.id) });
}
for (const [slug, name] of magic) {
  const card = await json(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
  const url = card.image_uris?.large;
  if (!url) throw new Error(`No single-face image for ${name}`);
  await image(url, path.join(root, 'magic', `${slug}.jpg`));
  provenance.push({ franchise: 'Magic: The Gathering', slug, title: name, source: url, card: card.id, set: card.set_name });
  await new Promise(resolve => setTimeout(resolve, 500));
}
await writeFile(path.join(root, 'sources.json'), `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`Downloaded ${provenance.length} additional non-holo cards.`);
