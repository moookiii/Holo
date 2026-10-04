/** Set-specific metadata import. Image review/acquisition is a separate local pipeline. */
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const metadata = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=Legend%20of%20Blue%20Eyes%20White%20Dragon';
const args = process.argv.slice(2);
if (args.some(a => !['--refresh-metadata', '--download', '--apply'].includes(a))) throw Error('Unknown sourcing option');
const cache = 'research/yugioh-lob/cards.json';
let raw;
if (args.includes('--refresh-metadata')) {
  const response = await fetch(metadata);
  if (!response.ok) throw Error('YGOPRODeck set metadata unavailable');
  raw = await response.json();
} else raw = JSON.parse(await readFile(cache, 'utf8'));
const previous = JSON.parse(await readFile('src/yugioh/sets/lob-data.json', 'utf8'));
const names = { 'LOB-012': 'Trial of Hell', 'LOB-070': 'Red-Eyes B. Dragon' };
const rows = raw.data.flatMap(c => (c.card_sets ?? []).filter(s => /^LOB-\d{3}$/.test(s.set_code)).map(s => ({ c, s })))
  .sort((a, b) => a.s.set_code.localeCompare(b.s.set_code));
if (rows.length !== 126 || new Set(rows.map(x => x.s.set_code)).size !== 126) throw Error('Unexpected original LOB catalog');
const result = rows.map(({ c, s }, index) => {
  const old = previous.find(row => row.number === s.set_code);
  if (!old || s.set_code !== `LOB-${String(index).padStart(3, '0')}`) throw Error('Missing scoped baseline');
  const passcode = String(c.id).padStart(8, '0');
  if (old.passcode !== passcode) throw Error(`${s.set_code}: changed identity requires printing re-review`);
  return { ...old, name: names[s.set_code] ?? c.name, modernName: c.name, passcode,
    rarity: s.set_rarity === 'Short Print' ? 'Common' : s.set_rarity,
    distribution: ['LOB-097', 'LOB-098'].includes(s.set_code) ? 'reported-super-short-print' : s.set_rarity === 'Short Print' ? 'reported-short-print' : 'unclassified',
    type: c.type, modernText: c.desc, source: { ...old.source, metadata } };
});
// Dry runs audit only. Refreshing metadata never silently overwrites a selected front.
if (args.includes('--apply')) {
  if (args.includes('--refresh-metadata')) await writeFile(cache, JSON.stringify(raw, null, 2) + '\n');
  await writeFile('src/yugioh/sets/lob-data.json', JSON.stringify(result, null, 2) + '\n');
}
const run = spawnSync(process.env.PYTHON ?? 'python', ['scripts/lob-fronts/pipeline.py', ...args.filter(a => a !== '--refresh-metadata')], { stdio: 'inherit' });
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
