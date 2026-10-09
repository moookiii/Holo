import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { celebrationCards, celebrationSet, celebrationUpcSet } from '../src/pokemon/CelebrationCatalog.ts';
import { celebrationDefinition } from '../src/pokemon/CelebrationSurfaces.ts';
import { celebrationRateEstimates } from '../src/pokemon/CelebrationRecipe.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { resolveCardProfile } from '../src/materials/profiles/resolveCardProfile.ts';

test('199 canonical TCGL printings retain exact original front/foil/etch bytes and explicit review status', () => {
  const manifest = JSON.parse(readFileSync('docs/30th-asset-preparation.json', 'utf8'));
  assert.equal(celebrationCards.length, 199);
  assert.equal(new Set(celebrationCards.map(c => c.id)).size, 199);
  assert.equal(manifest.normals, 45);
  let originals = 0, normals = 0;
  for (const card of celebrationCards) {
    assert.deepEqual(card.variants, ['holo']);
    const entry = manifest.printings.find((p: any) => p.cardId === card.id);
    const stem = entry.tcglCardId.replace('_', '-');
    for (const [kind, source] of Object.entries(entry.sources) as [string, any][]) {
      const bytes = readFileSync(`public/cards/pokemon/30th-celebration/${stem}-${kind}.png`);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
      originals++;
    }
    const definition = celebrationDefinition(card.id);
    assert.equal(definition.pokemon?.treatmentStatus, 'deferred');
    assert.equal(definition.proceduralFoil, undefined);
    assert.equal(definition.maps?.height, undefined);
    assert.equal(definition.mapSettings?.embossStrength, 0);
    const profile = resolveCardProfile(definition);
    assert.equal(profile.maps?.direction, undefined, 'No borrowed optical texture');
    assert.equal(profile.structure.field, 'plain');
    assert.equal(profile.structure.engraving, 0); assert.equal(profile.structure.relief, 0);
    assert.equal(profile.glints.strength, 0);
    for (const path of Object.values(definition.maps!)) assert.ok(existsSync(`public${path}`), String(path));
    if (definition.maps?.normal) normals++;
    assert.throws(() => celebrationDefinition(card.id, 'reverse'), /no reverse variant/);
  }
  assert.equal(originals, 443); assert.equal(normals, 45);
  assert.deepEqual(celebrationCards.filter(c => c.setId === '30th-rgb').map(c => c.localId), ['R/RGB', 'G/RGB', 'B/RGB']);
  assert.equal(celebrationCards.filter(c => c.setId === 'mee').length, 8);
  assert.equal(celebrationCards.filter(c => c.rarity === 'Pikachu Rare').length, 30);
});

test('both products resolve entirely locally without changing canonical subset identities', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw Error('Anniversary metadata must not require remote TCGdex'); });
  const catalog = new TcgdexAdapter(), signal = new AbortController().signal;
  for (const product of [celebrationSet, celebrationUpcSet]) {
    const set = await catalog.set(product.id, signal);
    const cards = await catalog.cards(set, signal);
    assert.equal(cards.length, product.id === '30th' ? 199 : 30);
    assert.ok(cards.every(c => c.front?.startsWith('/cards/pokemon/30th-celebration/')));
    assert.deepEqual(cards.map(c => c.id).sort(), [...product.cardIds].sort());
    if (product.id !== '30th') assert.ok(cards.every(c => c.setId === '30th-classic'));
  }
});

test('retail six-card and UPC three-card packs are deterministic and fail closed on incomplete metadata', () => {
  for (const [set, booster, count] of [['30th', 'english', 6], ['30th-classic-upc', 'upc-classic', 3]] as const) {
    const pool = set === '30th' ? celebrationCards : celebrationCards.filter(c => c.setId === '30th-classic');
    const pack = collatePokemon(set, booster, 120, pool);
    assert.equal(pack.pulls.length, count);
    assert.deepEqual(pack, collatePokemon(set, booster, 120, [...pool].reverse()));
    assert.ok(pack.pulls.every(p => p.variant === 'holo'));
    assert.throws(() => collatePokemon(set, booster, 120, pool.slice(1)), /Incomplete/);
    assert.throws(() => collatePokemon(set, 'wrong', 120, pool), /no validated recipe/);
    if (count === 3) assert.equal(new Set(pack.pulls.map(p => p.card.id)).size, 3);
  }
});

test('20,000 seeded retail packs obey slots and estimated rarity probabilities', () => {
  const counts = new Map<string, number>(); let twoHits = 0;
  for (let seed = 0; seed < 20000; seed++) {
    const p = collatePokemon('30th', 'english', seed, celebrationCards).pulls;
    assert.equal(p.length, 6);
    assert.equal(p[0].card.rarity, 'Common'); assert.equal(p[1].card.rarity, 'Common');
    assert.ok(['Common', 'Illustration Rare', 'Classic Collection'].includes(p[2].card.rarity));
    assert.ok(['Rare', 'Double Rare', 'Special Illustration Rare', 'Futuristic Rare', 'Rgb Rare'].includes(p[3].card.rarity));
    assert.equal(p[4].card.rarity, 'Pikachu Rare'); assert.equal(p[4].card.setId, '30th');
    assert.equal(p[5].card.rarity, 'Energy'); assert.equal(p[5].card.setId, 'mee');
    const commons = p.filter(pull => pull.card.rarity === 'Common');
    assert.equal(new Set(commons.map(pull => pull.card.id)).size, commons.length);
    for (const pull of p.slice(2, 4)) counts.set(pull.card.rarity, (counts.get(pull.card.rarity) ?? 0) + 1);
    if (p[2].card.rarity !== 'Common' && p[3].card.rarity !== 'Rare') twoHits++;
  }
  const rates = celebrationRateEstimates;
  for (const [rarity, rate] of [['Double Rare', rates.double], ['Illustration Rare', rates.illustration], ['Classic Collection', rates.classic], ['Special Illustration Rare', rates.special], ['Futuristic Rare', rates.futuristic], ['Rgb Rare', rates.rgb]] as const) {
    const expected = rate * 20000;
    assert.ok(Math.abs((counts.get(rarity) ?? 0) - expected) < 6 * Math.sqrt(expected * (1 - rate)) + 1, `${rarity}: ${counts.get(rarity)} expected ${expected}`);
  }
  assert.ok(twoHits > 1000);
});
