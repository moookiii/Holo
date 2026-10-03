/** Explicit asset import, never called by the browser. Reuses local files on rerun. */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = 'public/cards/yugioh/lob-first-edition';
await mkdir(root, { recursive: true });
await mkdir('src/yugioh/sets', { recursive: true });
await mkdir('public/catalog/yugioh', { recursive: true });
const metadata = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=Legend%20of%20Blue%20Eyes%20White%20Dragon';
const gallery = 'https://yugioh.fandom.com/wiki/Set_Card_Galleries:Legend_of_Blue_Eyes_White_Dragon_(TCG-NA-1E)';
const exists = async p => access(p).then(() => true, () => false);
const raw = await exists('research/yugioh-lob/cards.json') ? JSON.parse(await readFile('research/yugioh-lob/cards.json', 'utf8')) : await (await fetch(metadata)).json();
const names = { 'LOB-012': 'Trial of Hell', 'LOB-070': 'Red-Eyes B. Dragon' };
const codes = { Common: 'C', Rare: 'R', 'Super Rare': 'SR', 'Ultra Rare': 'UR', 'Secret Rare': 'ScR', 'Short Print': 'C' };
const rows = raw.data.flatMap(c => c.card_sets.filter(s => /^LOB-\d{3}$/.test(s.set_code)).map(s => ({ c, s })))
  .sort((a, b) => a.s.set_code.localeCompare(b.s.set_code));
if (rows.length !== 126 || new Set(rows.map(x => x.s.set_code)).size !== 126) throw Error('Unexpected LOB catalog');
const result = [];
for (const { c, s } of rows) {
  const number = s.set_code, name = names[number] ?? c.name;
  const provenancePath = `${root}/${number}.json`;
  let source;
  if (await exists(provenancePath)) source = JSON.parse(await readFile(provenancePath, 'utf8'));
  else {
    const stem = name.replace(/[^a-zA-Z0-9]/g, '') + `-LOB-NA-${codes[s.set_rarity]}-1E`;
    for (const ext of ['jpg', 'png']) {
      const filename = `${stem}.${ext}`, h = createHash('md5').update(filename).digest('hex');
      const url = `https://static.wikia.nocookie.net/yugioh/images/${h[0]}/${h.slice(0, 2)}/${filename}/revision/latest`;
      const response = await fetch(url);
      if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
        await writeFile(`${root}/${number}.jpg`, Buffer.from(await response.arrayBuffer()));
        source = { image: url, reference: gallery, fidelity: 'original-scan', notes: 'Gallery-labeled North American 1st Edition scan; photographed foil remains in source. Resolution and physical registration vary.' };
        break;
      }
    }
    if (!source) {
      const image = c.card_images[0].image_url, response = await fetch(image);
      if (!response.ok) throw Error(`${number}: image unavailable`);
      await writeFile(`${root}/${number}.jpg`, Buffer.from(await response.arrayBuffer()));
      source = { image, reference: metadata, fidelity: 'general-image-fallback', notes: 'YGOPRODeck general card representation; NOT an exact 2002 North American 1st Edition scan. Printed name, text, code, edition and stamp may differ.' };
    }
    await writeFile(provenancePath, JSON.stringify(source, null, 2) + '\n');
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  const rarity = s.set_rarity === 'Short Print' ? 'Common' : s.set_rarity;
  result.push({ number, name, modernName: c.name, passcode: String(c.id).padStart(8, '0'), rarity,
    distribution: ['LOB-097', 'LOB-098'].includes(number) ? 'reported-super-short-print' : s.set_rarity === 'Short Print' ? 'reported-short-print' : 'unclassified',
    type: c.type, modernText: c.desc, source: { ...source, metadata }, front: `/${root.replace('public/', '')}/${number}.jpg` });
  console.log(number, source.fidelity);
}
await writeFile('src/yugioh/sets/lob-data.json', JSON.stringify(result, null, 2) + '\n');
const sets = await exists('research/yugioh-lob/sets.json') ? JSON.parse(await readFile('research/yugioh-lob/sets.json', 'utf8')) : await (await fetch('https://db.ygoprodeck.com/api/v7/cardsets.php')).json();
await writeFile('public/catalog/yugioh/sets.json', JSON.stringify({ version: 1, fetchedAt: new Date().toISOString(), records: sets }) + '\n');
console.log('Imported', result.length, 'cards;', result.filter(c => c.source.fidelity !== 'original-scan').map(c => c.number));
