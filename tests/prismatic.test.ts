import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { prismaticCards, prismaticCard, prismaticPrintings, prismaticPrinting, prismaticSet } from '../src/pokemon/PrismaticCatalog.ts';
import { prismaticRecipe } from '../src/pokemon/PrismaticRecipe.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';

const path = new URL('../public/cards/pokemon/prismatic-evolutions/', import.meta.url);
test('complete English checklist and retail printings match the independent detailed source records', () => {
  const snapshot = JSON.parse(readFileSync(new URL('catalog.json', path), 'utf8'));
  assert.equal(prismaticCards.length, 180);
  assert.equal(new Set(prismaticCards.map(card => card.id)).size, 180);
  const counts: Record<string, number> = {};
  for (const [i, card] of prismaticCards.entries()) {
    assert.equal(Number(card.localId), i + 1);
    counts[card.rarity] = (counts[card.rarity] ?? 0) + 1;
    const source = snapshot.cards.find((entry: { id: string }) => entry.id === card.id);
    for (const [variant, foil] of [['pokeball-reverse', 'pokeball'], ['masterball-reverse', 'masterball']] as const) {
      assert.equal(card.variants.includes(variant), source.variantsDetailed.some((entry: { foil?: string; stamp?: unknown; subtype?: string }) => entry.foil === foil && !entry.stamp && !entry.subtype), card.id);
    }
    assert.ok(card.front && existsSync(new URL(`../public${card.front}`, import.meta.url)));
    assert.ok(!card.variants.includes('normal') || ['Common', 'Uncommon'].includes(card.rarity));
  }
  assert.deepEqual(counts, { Common: 46, Uncommon: 33, Rare: 21, 'Double Rare': 25, 'ACE SPEC Rare': 6, 'Ultra Rare': 12, 'Special Illustration Rare': 32, 'Hyper Rare': 5 });
  assert.equal(prismaticPrintings.filter(print => print.inScope).length, 347);
  assert.equal(prismaticPrintings.filter(print => print.variant === 'pokeball-reverse').length, 100);
  assert.equal(prismaticPrintings.filter(print => print.variant === 'masterball-reverse').length, 67);
  assert.equal(prismaticPrintings.filter(print => !print.inScope).length, 100);
  assert.equal(prismaticPrintings.filter(print => print.textured).length, 216);
  assert.ok(prismaticPrintings.filter(print => print.textured).every(print => print.inScope));
});

test('every downloaded front retains the source bytes and exact card identity', () => {
  const assets = JSON.parse(readFileSync(new URL('sources.json', path), 'utf8'));
  assert.equal(assets.length, 180);
  for (const asset of assets) {
    const bytes = readFileSync(new URL(asset.file, path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.cardId);
    assert.equal(prismaticCard(asset.cardId).front?.split('/').at(-1), asset.file);
    assert.equal(asset.role, 'printed-front-not-relief-evidence');
  }
});

test('invalid printings, promo finishes and fabricated rarity families never enter the retail set', () => {
  assert.throws(() => prismaticPrinting('sv08.5-093', 'masterball-reverse'), /Invalid/);
  assert.throws(() => prismaticPrinting('sv08.5-006', 'pokeball-reverse'), /Invalid/);
  assert.throws(() => prismaticPrinting('sv08.5-116', 'reverse'), /Invalid/);
  assert.throws(() => prismaticPrinting('sv08.5-161', 'normal'), /Invalid/);
  assert.throws(() => prismaticCard('sv08.5-181'), /Unknown/);
  assert.equal(prismaticPrinting('sv08.5-059', 'holo').textured, false);
  assert.equal(prismaticPrinting('sv08.5-132', 'holo').treatment, 'fullart-texture');
  assert.equal(prismaticPrinting('sv08.5-161', 'holo').treatment, 'sir-texture');
  assert.equal(prismaticPrinting('sv08.5-179', 'holo').treatment, 'gold');
  assert.equal(prismaticPrinting('sv08.5-059', 'reverse').profileId, undefined);
});

test('Prismatic metadata loads locally, remains abortable and rejects mismatched set identities', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network request'); });
  const adapter = new TcgdexAdapter(), controller = new AbortController();
  const set = await adapter.set('sv08.5', controller.signal);
  const cards = await adapter.cards(set, controller.signal);
  assert.equal(cards.length, 180);
  assert.deepEqual(cards.find(card => card.id === 'sv08.5-059')?.variants, ['holo', 'reverse', 'pokeball-reverse', 'masterball-reverse']);
  await assert.rejects(adapter.card('sv08.5-001', { ...set, id: 'sv01' }, controller.signal), /does not belong/);
  controller.abort(); await assert.rejects(adapter.set('sv08.5', controller.signal), { name: 'AbortError' });
});

test('ordinary-pack collation preserves real slots, independent ball hits, all rarity pools and deterministic identity', () => {
  const counts: Record<string, number> = {}, reached = new Set<string>(); let doubleBall = 0, reverseEnergy = 0;
  for (let seed = 0; seed < 5000; seed++) {
    const pack = collatePokemon(prismaticSet.id, 'standard', seed, prismaticCards, prismaticRecipe);
    assert.equal(pack.pulls.length, 11);
    assert.ok(pack.pulls.slice(0, 4).every(pull => pull.card.rarity === 'Common' && pull.variant === 'normal'));
    assert.ok(pack.pulls.slice(4, 7).every(pull => pull.card.rarity === 'Uncommon' && pull.variant === 'normal'));
    assert.ok(['holo', 'reverse', 'pokeball-reverse'].includes(pack.pulls[7].variant));
    assert.ok(['holo', 'reverse', 'masterball-reverse'].includes(pack.pulls[8].variant));
    assert.ok(['Rare', 'Double Rare', 'Ultra Rare'].includes(pack.pulls[9].card.rarity));
    assert.equal(pack.pulls[10].variant, 'normal'); assert.equal(pack.pulls[10].card.setId, 'sve');
    doubleBall += Number(pack.pulls[7].variant === 'pokeball-reverse' && pack.pulls[8].variant === 'masterball-reverse');
    for (const pull of pack.pulls) {
      assert.ok(pull.card.variants.includes(pull.variant)); reached.add(pull.card.id);
      if (pull.variant === 'masterball-reverse') assert.equal(pull.card.category, 'Pokemon');
      reverseEnergy += Number(pull.variant === 'reverse' && pull.card.setId === 'sve');
      const key = pull.variant.endsWith('-reverse') ? pull.variant : pull.card.rarity;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  for (const [key, rate] of [['pokeball-reverse', .3310], ['masterball-reverse', .0492], ['Double Rare', .1651], ['Ultra Rare', .0746], ['ACE SPEC Rare', .0468], ['Special Illustration Rare', .0222], ['Hyper Rare', .0056]] as const) {
    const expected = 5000 * rate;
    assert.ok(Math.abs(counts[key] - expected) < 5 * Math.sqrt(expected * (1 - rate)), `${key}: ${counts[key]}`);
  }
  assert.ok(doubleBall > 40); assert.ok(reverseEnergy > 100);
  assert.equal(reached.size, 188);
  const exact = collatePokemon('sv08.5', 'standard', 175, prismaticCards, prismaticRecipe);
  assert.deepEqual(exact, collatePokemon('sv08.5', 'standard', 175, [...prismaticCards].reverse(), prismaticRecipe));
  assert.throws(() => collatePokemon('sv08.5', 'standard', 1, prismaticCards.slice(1), prismaticRecipe), /Incomplete.*checklist/);
});
