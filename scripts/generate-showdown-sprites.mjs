import { writeFile } from 'node:fs/promises';

// Offline catalog: never probe thousands of sprite URLs in the browser.
const origin = 'https://play.pokemonshowdown.com';
const [dex, directory] = await Promise.all([
  fetch(`${origin}/data/pokedex.json`).then(r => r.json()),
  fetch(`${origin}/sprites/ani/`).then(r => r.text()),
]);
const files = new Set([...directory.matchAll(/href="\.\/([^"/]+)\.gif"/g)].map(m => m[1]));
const id = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const normalized = new Map([...files].map(file => [id(file), file]));
const entries = new Map();
const display = name => name.normalize('NFC').replace('Nidoran-F', 'Nidoran♀').replace('Nidoran-M', 'Nidoran♂');
for (const pokemon of Object.values(dex)) {
  if (!Number.isInteger(pokemon.num) || pokemon.num <= 0 || ['CAP', 'Custom'].includes(pokemon.isNonstandard)) continue;
  for (const name of [pokemon.name, ...(pokemon.cosmeticFormes ?? [])]) {
    const key = id(name);
    const sprite = normalized.get(key) ?? null;
    entries.set(key, { number: pokemon.num, name: display(name), sprite });
    if (files.has(`${sprite}-f`) && !key.startsWith('nidoran')) {
      entries.set(`${key}female`, { number: pokemon.num, name: `${display(name)} (Female)`, sprite: `${sprite}-f` });
    }
  }
}
// Directory-only cosmetic variants (e.g. Alcremie sweets) belong to their base species.
const bases = Object.values(dex).filter(p => Number.isInteger(p.num) && p.num > 0 && !p.baseSpecies).sort((a, b) => id(b.name).length - id(a.name).length);
const used = new Set([...entries.values()].map(e => e.sprite));
for (const sprite of files) {
  if (used.has(sprite)) continue;
  const base = bases.find(p => sprite.startsWith(`${id(p.name)}-`));
  if (!base) continue;
  const key = id(sprite);
  if (entries.has(key)) continue; // Duplicate legacy filenames.
  const suffix = sprite.slice(id(base.name).length + 1).split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
  entries.set(key, { number: base.num, name: `${display(base.name)} (${suffix})`, sprite });
}
const baseNames = new Set(bases.map(p => display(p.name)));
const rows = [...entries.values()].sort((a, b) => a.number - b.number || Number(!baseNames.has(a.name)) - Number(!baseNames.has(b.name)) || a.name.localeCompare(b.name));
await writeFile('src/gallery/showdown-sprites.generated.json', JSON.stringify(rows));
console.log(`${rows.length} entries; ${rows.filter(r => !r.sprite).length} without animated sprites`);
