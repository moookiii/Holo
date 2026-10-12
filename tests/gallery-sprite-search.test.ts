import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gallerySearchText } from '../src/gallery/GallerySearchText.ts';
import { GalleryQueryIndex } from '../src/gallery/GalleryQuery.ts';
import type { CardDefinition } from '../src/card/CardDefinition.ts';

const sprites = JSON.parse(readFileSync(new URL('../src/gallery/showdown-sprites.generated.json', import.meta.url), 'utf8')) as { number: number; name: string; sprite: string | null }[];
test('official artwork resolves the missing animated forms', () => {
  const art = JSON.parse(readFileSync(new URL('../src/gallery/pokemon-artwork.generated.json', import.meta.url), 'utf8'));
  assert.equal(art['Venusaur-Gmax'], 10195);
  assert.equal(art['Blastoise-Gmax'], 10197);
  assert.equal(art['Pikachu-World'], 10160);
  assert.ok(sprites.every(p => Number.isInteger(art[p.name]) && art[p.name] > 0));
});
test('catalog covers National Dex, correct special filenames and forms', () => {
  const lookup = (name: string) => sprites.find(p => p.name === name)?.sprite;
  assert.equal(lookup('Nidoran♀'), 'nidoranf'); assert.equal(lookup('Nidoran♂'), 'nidoranm');
  assert.equal(lookup('Farfetch’d'), 'farfetchd'); assert.equal(lookup('Mr. Mime'), 'mrmime');
  assert.equal(lookup('Flabébé'), 'flabebe'); assert.equal(lookup('Type: Null'), 'typenull');
  assert.equal(lookup('Charizard-Mega-X'), 'charizard-megax');
  assert.equal(lookup('Raichu-Alola'), 'raichu-alola');
  for (const name of ['Venusaur-Gmax', 'Blastoise-Gmax', 'Pikachu-World']) {
    assert.ok(sprites.some(p => p.name === name), `${name} remains selectable without a GIF`);
    assert.equal(lookup(name), null);
  }
  assert.equal(new Set(sprites.map(p => p.number)).size, 1025);
  assert.ok(sprites.every((p, i) => !i || p.number >= sprites[i - 1].number));
  assert.ok(sprites.some(p => p.sprite === null));
});
test('selector names use the existing indexed search and preserve facets', () => {
  const names = ["Farfetch'd", 'Flabébé', 'Nidoran♀', 'Mr. Mime', 'Alolan Raichu'];
  const cards = names.map((title, i) => ({ id: `sprite-test-${i}`, title, set: 'Base Set', number: `${i}`, franchise: 'Pokémon', profile: 'holo' })) as CardDefinition[];
  const index = new GalleryQueryIndex(cards);
  for (const [query, expected] of [['Farfetch’d', names[0]], ['Flabébé', names[1]], ['Nidoran♀', names[2]], ['Mr. Mime', names[3]], ['Raichu-Alola', names[4]]]) {
    assert.equal(index.filter({ search: query, game: 'Pokémon' })[0]?.title, expected);
    assert.equal(index.filter({ search: query, game: 'Yu-Gi-Oh!' }).length, 0);
  }
  assert.equal(gallerySearchText('Nidoran♀'), 'nidoran female');
});
