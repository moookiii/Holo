import { readFile, writeFile } from 'node:fs/promises';

const catalog = JSON.parse(await readFile('src/gallery/showdown-sprites.generated.json', 'utf8'));
const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=10000');
if (!response.ok) throw new Error(`PokéAPI: ${response.status}`);
const { results } = await response.json();
const normalize = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/♀/g, 'f').replace(/♂/g, 'm').replace(/[^a-z0-9]/g, '');
const forms = new Map(results.map(p => [normalize(p.name), Number(p.url.match(/\/(\d+)\/$/)[1])]));
const artwork = {};
const aliases = { 'Pikachu-World': 'pikachu-world-cap' };
for (const pokemon of catalog) {
  const id = forms.get(normalize(aliases[pokemon.name] ?? pokemon.name)) ?? pokemon.number;
  artwork[pokemon.name] = id;
}
// Verify absent-animation forms against the actual official-artwork response.
const pending = catalog.filter(p => !p.sprite);
await Promise.all(Array.from({ length: 4 }, async () => {
  while (pending.length) {
    const pokemon = pending.shift();
    const id = artwork[pokemon.name];
    const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!r.ok) throw new Error(`PokéAPI ${id}: ${r.status}`);
    const data = await r.json();
    if (!data.sprites.other['official-artwork'].front_default) artwork[pokemon.name] = pokemon.number;
  }
}));
await writeFile('src/gallery/pokemon-artwork.generated.json', JSON.stringify(artwork));
console.log(`Mapped ${Object.keys(artwork).length} official artwork fallbacks`);
