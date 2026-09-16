import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/cards/non-holo');
const headers = { 'User-Agent': 'HoloArchive/1.0 (local interactive card viewer)', Accept: 'application/json' };
const pokemon = [
  ['bulbasaur',44],['charmander',46],['diglett',47],['drowzee',49],['gastly',50],['koffing',51],
  ['machop',52],['metapod',54],['nidoran-m',55],['onix',56],['pikachu',58],['poliwag',59],
  ['ponyta',60],['sandshrew',62],['squirtle',63],['staryu',65],['voltorb',67],['weedle',69],
];
const yugioh = [
  ['kuriboh','Kuriboh'],['mystical-elf','Mystical Elf'],['celtic-guardian','Celtic Guardian'],
  ['giant-soldier-of-stone','Giant Soldier of Stone'],['battle-ox','Battle Ox'],['skull-servant','Skull Servant'],
  ['feral-imp','Feral Imp'],['beaver-warrior','Beaver Warrior'],['mystic-horseman','Mystic Horseman'],
  ['silver-fang','Silver Fang'],['winged-dragon-guardian-of-the-fortress-1','Winged Dragon, Guardian of the Fortress #1'],
  ['la-jinn-the-mystical-genie-of-the-lamp','La Jinn the Mystical Genie of the Lamp'],
  ['summoned-skull','Summoned Skull'],['sangan','Sangan'],['man-eater-bug','Man-Eater Bug'],['trap-hole','Trap Hole'],
];
const magic = [
  ['llanowar-elves','Llanowar Elves'],['lightning-bolt','Lightning Bolt'],['counterspell','Counterspell'],
  ['dark-ritual','Dark Ritual'],['giant-growth','Giant Growth'],['disenchant','Disenchant'],
  ['grizzly-bears','Grizzly Bears'],['serra-angel','Serra Angel'],['shivan-dragon','Shivan Dragon'],
  ['air-elemental','Air Elemental'],['terror','Terror'],['unsummon','Unsummon'],['stone-rain','Stone Rain'],
  ['raise-dead','Raise Dead'],['pacifism','Pacifism'],['birds-of-paradise','Birds of Paradise'],
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
for (const [slug, number] of pokemon) {
  const url = `https://images.pokemontcg.io/base1/${number}_hires.png`;
  await image(url, path.join(root, 'pokemon', `${slug}.png`));
  provenance.push({ franchise: 'Pokémon', slug, source: url, card: `base1/${number}` });
}
for (const [slug, name] of yugioh) {
  const result = await json(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(name)}`);
  const card = result.data[0], url = card.card_images[0].image_url;
  await image(url, path.join(root, 'yugioh', `${slug}.jpg`));
  provenance.push({ franchise: 'Yu-Gi-Oh!', slug, source: url, card: String(card.id) });
}
for (const [slug, name] of magic) {
  const card = await json(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
  const url = card.image_uris?.large;
  if (!url) throw new Error(`No single-face image for ${name}`);
  await image(url, path.join(root, 'magic', `${slug}.jpg`));
  provenance.push({ franchise: 'Magic: The Gathering', slug, source: url, card: card.id, set: card.set_name });
  await new Promise(resolve => setTimeout(resolve, 80));
}
await writeFile(path.join(root, 'sources.json'), `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`Downloaded ${provenance.length} non-holo cards.`);
