import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/cards/non-holo');
const catalogPath = path.resolve('src/card/NonHoloExpansion.ts');
const sourcesPath = path.join(root, 'sources.json');
const headers = { 'User-Agent': 'HoloArchive/1.0 (local interactive card viewer)', Accept: 'application/json' };
const targets = { pokemon: 67, yugioh: 67, magic: 66 };

const slugify = value => value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function json(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function image(url, destination) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 80_000) throw new Error(`Image is unexpectedly small (${bytes.length} bytes): ${url}`);
  await writeFile(destination, bytes);
  if (bytes.subarray(1, 4).toString() === 'PNG') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    const marker = bytes[offset + 1], length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
    offset += 2 + length;
  }
  throw new Error(`Unsupported image: ${url}`);
}

const existingSources = JSON.parse(await readFile(sourcesPath, 'utf8'));
const sourceText = await readFile('src/card/NonHoloCards.ts', 'utf8');
const otherCatalogText = (await Promise.all([
  'src/card/HoloBulkCards.ts', 'src/card/YugiohTopCards.ts', 'src/card/CardDefinition.ts',
].map(file => readFile(file, 'utf8')))).join('\n');
const existingSlugs = new Set([
  ...existingSources.map(entry => entry.slug),
  ...[...sourceText.matchAll(/\['([^']+)',\s*'[^']+'/g)].map(match => match[1]),
]);
const existingTitles = new Set(existingSources.map(entry => entry.title.toLocaleLowerCase()));
for (const match of sourceText.matchAll(/\['[^']+',\s*'([^']+)'/g)) existingTitles.add(match[1].toLocaleLowerCase());
for (const match of otherCatalogText.matchAll(/title:\s*['"]([^'"]+)['"]/g)) existingTitles.add(match[1].toLocaleLowerCase());
for (const match of otherCatalogText.matchAll(/\['[^']+',\s*'([^']+)'/g)) existingTitles.add(match[1].toLocaleLowerCase());
for (const title of ['Alakazam', 'Blastoise', 'Chansey', 'Clefairy', 'Gyarados', 'Hitmonchan', 'Machamp', 'Magneton', 'Mewtwo', 'Nidoking', 'Ninetales', 'Poliwrath', 'Raichu', 'Venusaur', 'Zapdos']) existingTitles.add(title.toLocaleLowerCase());

for (const family of Object.keys(targets)) await mkdir(path.join(root, family), { recursive: true });
for (const [family, prefix] of [['pokemon', 'sv1-'], ['yugioh', 'archive-'], ['magic', 'nonfoil-']]) {
  for (const file of await readdir(path.join(root, family))) if (file.startsWith(prefix)) await unlink(path.join(root, family, file));
}
const cards = [];
const provenance = [];

// Pokémon's public data repository exposes printed rarity and canonical high-resolution art URLs.
const pokemonData = await json('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en/sv1.json');
for (const card of pokemonData) {
  if (cards.filter(item => item.family === 'pokemon').length >= targets.pokemon) break;
  if (!['Common', 'Uncommon'].includes(card.rarity)) continue;
  const slug = `sv1-${slugify(card.name)}-${card.number}`;
  if (existingSlugs.has(slug) || existingTitles.has(card.name.toLocaleLowerCase())) continue;
  const url = card.images.large;
  await image(url, path.join(root, 'pokemon', `${slug}.png`));
  cards.push({ family: 'pokemon', slug, title: card.name, set: `Scarlet & Violet · ${card.rarity}`, number: card.number });
  existingTitles.add(card.name.toLocaleLowerCase()); existingSlugs.add(slug);
  provenance.push({ franchise: 'Pokémon', slug, title: card.name, source: url, metadata: 'https://github.com/PokemonTCG/pokemon-tcg-data', card: card.id, rarity: card.rarity, nonHolo: true });
}

// YGOPRODeck images are clean 813x1185 database renders. The app deliberately assigns print-only stock.
const yugiohData = await json('https://db.ygoprodeck.com/api/v7/cardinfo.php');
for (const card of yugiohData.data) {
  if (cards.filter(item => item.family === 'yugioh').length >= targets.yugioh) break;
  if (!card.card_images?.[0]?.image_url) continue;
  const slug = `archive-${slugify(card.name)}-${card.id}`;
  if (existingSlugs.has(slug) || existingTitles.has(card.name.toLocaleLowerCase())) continue;
  const url = card.card_images[0].image_url;
  const destination = path.join(root, 'yugioh', `${slug}.jpg`);
  const [width, height] = await image(url, destination);
  if (width < 813 || height < 1185) { await unlink(destination); continue; }
  cards.push({ family: 'yugioh', slug, title: card.name, set: 'Card Database · Non-holo stock', number: String(card.id) });
  existingTitles.add(card.name.toLocaleLowerCase()); existingSlugs.add(slug);
  provenance.push({ franchise: 'Yu-Gi-Oh!', slug, title: card.name, source: url, metadata: 'https://db.ygoprodeck.com/api/v7/cardinfo.php', card: String(card.id), nonHolo: true });
}

// Scryfall can explicitly constrain results to paper printings available in nonfoil.
let next = 'https://api.scryfall.com/cards/search?q=is%3Anonfoil+game%3Apaper+-is%3Adfc&unique=cards&order=edhrec';
while (next && cards.filter(item => item.family === 'magic').length < targets.magic) {
  const page = await json(next);
  for (const card of page.data) {
    if (cards.filter(item => item.family === 'magic').length >= targets.magic) break;
    if (!card.image_uris?.png || !card.nonfoil) continue;
    const slug = `nonfoil-${slugify(card.name)}-${card.collector_number}`;
    if (existingSlugs.has(slug) || existingTitles.has(card.name.toLocaleLowerCase())) continue;
    const url = card.image_uris.png;
    await image(url, path.join(root, 'magic', `${slug}.png`));
    cards.push({ family: 'magic', slug, title: card.name, set: `${card.set_name} · Nonfoil`, number: card.collector_number });
    existingTitles.add(card.name.toLocaleLowerCase()); existingSlugs.add(slug);
    provenance.push({ franchise: 'Magic: The Gathering', slug, title: card.name, source: url, metadata: card.scryfall_uri, card: card.id, set: card.set_name, nonHolo: true });
    await pause(90);
  }
  next = page.has_more ? page.next_page : null;
}

if (cards.length !== 200) throw new Error(`Expected 200 cards, selected ${cards.length}`);
const counts = Object.fromEntries(Object.keys(targets).map(family => [family, cards.filter(card => card.family === family).length]));
for (const [family, count] of Object.entries(targets)) if (counts[family] !== count) throw new Error(`${family}: expected ${count}, selected ${counts[family]}`);

const generated = `// Generated by scripts/fetch-non-holo-expansion.mjs.\nexport const nonHoloExpansionCatalog = ${JSON.stringify(cards, null, 2)} as const;\n`;
await writeFile(catalogPath, generated);
await writeFile(sourcesPath, `${JSON.stringify([...existingSources.filter(entry => !String(entry.slug).startsWith('sv1-') && !String(entry.slug).startsWith('archive-') && !String(entry.slug).startsWith('nonfoil-')), ...provenance], null, 2)}\n`);
console.log(`Downloaded ${cards.length} cards: ${JSON.stringify(counts)}`);
