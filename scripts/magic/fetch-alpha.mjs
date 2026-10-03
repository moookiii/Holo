import { mkdir, writeFile, access } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';

const headers = { 'User-Agent': 'HoloStudio/0.1 (Limited Edition Alpha catalog importer)', Accept: 'application/json' };
const root = 'public/cards/magic/alpha';
await mkdir(root, { recursive: true });
await mkdir('src/magic/data', { recursive: true });
async function request(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  await pause(110);
  return response;
}
const set = await (await request('https://api.scryfall.com/sets/lea')).json();
let url = 'https://api.scryfall.com/cards/search?q=set%3Alea&unique=prints&order=set';
const cards = [];
while (url) {
  const page = await (await request(url)).json();
  cards.push(...page.data); url = page.has_more ? page.next_page : undefined;
}
if (set.card_count !== 295 || cards.length !== 295 || new Set(cards.map(c => c.collector_number)).size !== 295) throw new Error('Alpha catalog must contain 295 distinct printings');
const normalized = [];
for (const card of cards) {
  if (card.set !== 'lea' || card.foil || card.frame !== '1993' || card.border_color !== 'black' || card.rarity === 'mythic') throw new Error(`Unexpected Alpha printing: ${card.name}`);
  const file = `${root}/${card.collector_number}.jpg`;
  try { await access(file); } catch { await writeFile(file, Buffer.from(await (await request(card.image_uris.large)).arrayBuffer())); }
  normalized.push({ id: `magic:lea:${card.collector_number}`, scryfallId: card.id, number: card.collector_number,
    name: card.name, setId: card.set, setName: card.set_name, rarity: card.rarity, typeLine: card.type_line, colors: card.colors, artist: card.artist,
    front: `/${file.replace('public/', '')}`, thumbnail: `/${file.replace('public/', '')}`,
    image: card.image_uris.large, reference: card.scryfall_uri, metadata: card.uri,
    frame: card.frame, border: card.border_color, finishes: card.finishes });
}
await writeFile('src/magic/data/alpha-cards.json', JSON.stringify(normalized, null, 2) + '\n');
await writeFile(`${root}/source.json`, JSON.stringify({ set: { id: set.id, code: set.code, name: set.name, releasedAt: set.released_at, cardCount: set.card_count },
  fetchedAt: new Date().toISOString(), source: 'https://api.scryfall.com/sets/lea', copyright: 'Card images and text © Wizards of the Coast. Metadata from Scryfall.', images: 'Unmodified Scryfall large JPEG scans; collector numbers are Scryfall identifiers, not printed on Alpha.' }, null, 2) + '\n');

// Preserve the published cell identities; catalog rarity never selects slots.
const alphaHtml = await (await request('https://www.lethe.xyz/mtg/collation/lea.html')).text();
const betaHtml = await (await request('https://www.lethe.xyz/mtg/collation/leb.html')).text();
const tables = html => [...html.matchAll(/<table class="sheet">([\s\S]*?)<\/table>/g)].map(m => m[1]);
const alphaTables = tables(alphaHtml), betaTables = tables(betaHtml);
const alphaCells = table => [...table.matchAll(/href="https:\/\/scryfall.com\/card\/lea\/(\d+)\//g)].map(m => [ `magic:lea:${m[1]}` ]);
const uncommonCells = [...betaTables[1].matchAll(/<img title="([^"]+)"/g)].map(m => {
  const name = m[1].replace(/ \([ABC]\)$/, '').replaceAll('&amp;', '&');
  const matches = normalized.filter(c => c.name === name);
  if (!matches.length) throw new Error(`Unresolved Beta uncommon cell: ${name}`);
  // Alpha's uncommon land ART positions are unknown. Keep both candidates
  // instead of claiming Beta's third land art existed in Alpha.
  return matches.map(c => c.id);
});
const sheets = { common: alphaCells(alphaTables[0]), uncommon: uncommonCells, rare: alphaCells(alphaTables[1]) };
for (const [name, cells] of Object.entries(sheets)) if (cells.length !== 121 || cells.some(ids => ids.some(id => !normalized.some(c => c.id === id)))) throw new Error(`Invalid ${name} sheet`);
await writeFile('src/magic/data/alpha-sheets.json', JSON.stringify(sheets, null, 2) + '\n');
console.log(`Cached ${normalized.length} Alpha cards and three 121-cell sheet reconstructions.`);
