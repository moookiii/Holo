import test from 'node:test';
import assert from 'node:assert/strict';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonRecipes, recipeFor } from '../src/pokemon/recipes.ts';
import { boundedMap, SelectionTask } from '../src/pokemon/requests.ts';
import { pokemonDefinition, pokemonProfile } from '../src/pokemon/materials.ts';
import { packIdentity, prepareExactPack } from '../src/pack/PreparedPack.ts';
import { cards } from '../src/card/CardDefinition.ts';
import { getPack, resolvePackContents } from '../src/pack/PackDefinition.ts';
import type { PokemonCard, PrintVariant } from '../src/pokemon/types.ts';
import type { PreparedCardCpu } from '../src/card/CardCpuPreparation.ts';

const rarities = ['Common', 'Uncommon', 'Rare', 'Double Rare', 'Ultra Rare', 'Illustration Rare', 'Special Illustration Rare', 'Hyper Rare', 'ACE SPEC Rare'];
test('SV picture holos use traced frames without a procedural rectangle over the badge', () => {
  const card = fixture().find(c => c.rarity === 'Rare')!;
  const evolved = pokemonDefinition({ ...card, evolveFrom: 'Glimmet' }, 'holo', []);
  assert.equal(evolved.maps?.foil, '/cards/pokemon/sv-evolved-artwork.png');
  assert.equal(evolved.proceduralFoil, undefined);
  assert.equal(pokemonDefinition(card, 'holo', []).maps?.foil, '/cards/pokemon/sv-basic-artwork.svg');
  const full = pokemonDefinition({ ...card, rarity: 'Illustration Rare' }, 'holo', []);
  assert.equal(full.maps, undefined);
  assert.equal(full.proceduralFoil, 'full');
});
test('SV full-art rarities use the entire printed face without an inset mask or frame', () => {
  const card = fixture().find(c => c.rarity === 'Rare')!;
  for (const rarity of ['Illustration Rare', 'Special Illustration Rare', 'Ultra Rare', 'Hyper Rare']) {
    const definition = pokemonDefinition({ ...card, rarity, category: 'Trainer' }, 'holo', []);
    assert.deepEqual(definition.layout, { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] }, rarity);
    assert.equal(definition.maps, undefined, rarity);
    assert.equal(definition.proceduralFoil, 'full', rarity);
  }
  for (const rarity of ['Rare', 'Double Rare', 'ACE SPEC Rare']) {
    const definition = pokemonDefinition({ ...card, rarity }, 'holo', []);
    assert.deepEqual(definition.layout?.artwork, [48/600, 82/825, 553/600, 390/825], rarity);
  }
  const older = pokemonDefinition({ ...card, era: 'swsh', rarity: 'Illustration Rare' }, 'holo', []);
  assert.deepEqual(older.layout?.artwork, [.08, .10, .92, .48]);
});
function fixture(setId = 'sv01'): PokemonCard[] {
  return rarities.flatMap((rarity, r) => Array.from({ length: 8 }, (_, n) => ({
    id: `${setId}-${r * 10 + n}`, localId: `${r * 10 + n}`, name: `${rarity} ${n}`, setId, setName: setId,
    era: 'sv', seriesId: 'sv', seriesName: 'Scarlet & Violet', rarity,
    variants: (r < 2 ? ['normal', 'reverse'] : r === 2 ? ['reverse', 'holo'] : ['holo']) as PrintVariant[],
  })));
}
test('seeded packs are stable, immutable and independent of metadata response order', () => {
  const pool = fixture(); const pack = collatePokemon('sv01', 'standard', 123, pool);
  assert.deepEqual(pack, collatePokemon('sv01', 'standard', 123, [...pool].reverse()));
  assert.notDeepEqual(pack.pulls, collatePokemon('sv01', 'standard', 124, pool).pulls);
  assert.ok(Object.isFrozen(pack) && Object.isFrozen(pack.pulls) && Object.isFrozen(pack.pulls[0].card));
  assert.deepEqual(pack.pulls, collatePokemon('sv01', 'different-art', 123, pool).pulls);
  assert.notEqual(pack.identity, collatePokemon('sv01', 'different-art', 123, pool).identity);
});
test('all validated sets honor every slot, count, set, rarity and variant across seeds', () => {
  for (const recipe of pokemonRecipes.filter(recipe => recipe.era === 'sv')) for (let seed = 0; seed < 300; seed++) {
    const pack = collatePokemon(recipe.setId, 'standard', seed, fixture(recipe.setId));
    assert.equal(pack.pulls.length, 11); let cursor = 0;
    for (const slot of recipe.slots) {
      const group = pack.pulls.slice(cursor, cursor += slot.count);
      if (slot.unique) assert.equal(new Set(group.map(p => p.card.id)).size, group.length);
      for (const pull of group) {
        assert.equal(pull.card.setId, slot.pool === 'energy' ? 'sve' : recipe.setId);
        assert.ok(pull.card.variants.includes(pull.variant));
        assert.ok(slot.outcomes.some(o => o.variant === pull.variant && o.rarities.includes(pull.card.rarity)));
      }
    }
  }
});
test('booster membership is honored without redistributing absent outcome probabilities', () => {
  const pool = fixture().map((card, i) => ({ ...card, boosterIds: [i % 2 ? 'A' : 'B'] }));
  for (const booster of ['A', 'B']) {
    const pack = collatePokemon('sv01', booster, 9, pool);
    assert.ok(pack.pulls.filter(p => p.card.setId !== 'sve').every(p => p.card.boosterIds!.includes(booster)));
  }
  assert.throws(() => collatePokemon('sv01', 'C', 9, pool), /Incomplete/);
  assert.throws(() => collatePokemon('sv01', 'A', 9, pool.filter(c => c.rarity !== 'Hyper Rare')), /Incomplete/);
});
test('unsupported sets and wrong set recipes never borrow odds', () => {
  assert.equal(recipeFor('sv11'), undefined);
  assert.throws(() => collatePokemon('sv11', 'standard', 1, fixture('sv11')), /no validated/);
  assert.throws(() => collatePokemon('sv02', 'standard', 1, fixture('sv02'), recipeFor('sv01')), /no validated/);
});
test('every supported pack includes one deterministic Basic Energy and 151 can produce Cosmos foil Energy', () => {
  for (const recipe of pokemonRecipes.filter(recipe => recipe.era === 'sv')) for (let seed = 0; seed < 100; seed++) {
    const pack = collatePokemon(recipe.setId, 'featured', seed, fixture(recipe.setId));
    const energy = pack.pulls.filter(p => p.slot.startsWith('energy:'));
    assert.equal(energy.length, 1); assert.equal(energy[0].card.setId, 'sve');
    assert.equal(energy[0].card.rarity, 'Energy');
    assert.deepEqual(pack, collatePokemon(recipe.setId, 'featured', seed, fixture(recipe.setId)));
  }
  let foil = 0;
  for (let seed = 0; seed < 1000; seed++) foil += Number(collatePokemon('sv03.5', 'featured', seed, fixture('sv03.5')).pulls.at(-1)!.variant === 'holo');
  assert.ok(foil > 200 && foil < 300, `151 foil Energy frequency: ${foil}/1000`);
});
test('Temporal Forces ACE SPEC occupies the first reverse slot and can coexist with other hits', () => {
  let ace = 0, combined = 0;
  const pool = fixture('sv05');
  for (let seed = 0; seed < 3000; seed++) {
    const pack = collatePokemon('sv05', 'standard', seed, pool);
    for (const [index, pull] of pack.pulls.entries()) if (pull.card.rarity === 'ACE SPEC Rare') {
      ace++; assert.equal(index, 7); assert.equal(pull.variant, 'holo');
      if (pack.pulls[8].variant === 'holo' && pack.pulls[9].card.rarity !== 'Rare') combined++;
    }
  }
  assert.ok(ace > 100 && ace < 200, `ACE SPEC frequency: ${ace}/3000`);
  assert.ok(combined > 0, 'Independent slots must allow multiple hits');
});
test('generic collator supports different counts and guaranteed card-specific slots', () => {
  const pool = fixture();
  const recipe = { ...recipeFor('sv01')!, id: 'test-only', slots: [
    { id: 'guaranteed', count: 1, outcomes: [{ weight: 1, variant: 'normal' as const, rarities: ['Common'], cardIds: [pool[0].id] }] },
  ] };
  assert.equal(collatePokemon('sv01', 'standard', 7, pool, recipe).pulls[0].card.id, pool[0].id);
  assert.equal(collatePokemon('sv01', 'standard', 7, pool, recipe).pulls.length, 1);
});
test('preparation fixes Archive contents once, preserves identity and cannot reroll at opening', async () => {
  const definition = getPack('archive-02'); const seen: string[] = [];
  const prepared = await prepareExactPack(definition, 42, cards, new AbortController().signal, async card => {
    seen.push(card.id); return { definition: card } as PreparedCardCpu;
  });
  assert.deepEqual(prepared.contents, resolvePackContents(definition, 42));
  assert.deepEqual(seen, prepared.contents.map(p => p.cardId));
  assert.equal(prepared.identity, packIdentity(definition, 42, prepared.contents));
  assert.notEqual(prepared.identity, packIdentity(definition, 43));
  assert.notEqual(prepared.identity, packIdentity(getPack('archive-03'), 42));
  assert.ok(Object.isFrozen(prepared.contents));
});
test('set, booster, recipe version, seed and resolved contents invalidate identity', () => {
  const base = getPack('test-pack');
  const resolved = collatePokemon('sv01', 'standard', 1, fixture());
  const definition = { ...base, pokemon: resolved };
  const identity = packIdentity(definition, 1);
  for (const update of [{ setId: 'sv02' }, { boosterId: 'other' }, { recipeVersion: '2' }, { seed: 2 }]) {
    const changed = { ...resolved, ...update, identity: JSON.stringify(update) };
    assert.notEqual(identity, packIdentity({ ...definition, pokemon: changed }, 1));
  }
  assert.notEqual(identity, packIdentity(definition, 1, [{ cardId: 'other', rarity: 'standard' }]));
});
test('stale preparation and late uncancellable responses cannot be promoted', async () => {
  const selection = new SelectionTask(); const old = selection.begin(); let active = '';
  let finish!: () => void;
  const stale = new Promise<void>(resolve => { finish = resolve; }).then(() => { if (selection.current(old)) active = 'stale'; });
  const next = selection.begin(); assert.equal(old.signal.aborted, true);
  if (selection.current(next)) active = 'new'; finish(); await stale;
  assert.equal(active, 'new'); selection.cancel(); assert.equal(selection.current(next), false);
  const request = new AbortController();
  await assert.rejects(prepareExactPack(getPack('test-pack'), 1, cards, request.signal, async card => {
    request.abort(); return { definition: card } as PreparedCardCpu;
  }), { name: 'AbortError' });
});
test('metadata concurrency is bounded and cancellation stops queued work', async () => {
  let running = 0, peak = 0;
  const signal = new AbortController().signal;
  const results = await boundedMap([1, 2, 3, 4, 5, 6], 2, signal, async n => {
    peak = Math.max(peak, ++running); await new Promise(resolve => setTimeout(resolve, 2)); running--; return n * 2;
  });
  assert.deepEqual(results, [2, 4, 6, 8, 10, 12]); assert.equal(peak, 2);
  const cancel = new AbortController(); let count = 0;
  await assert.rejects(boundedMap([1, 2, 3, 4], 1, cancel.signal, async n => { count++; cancel.abort(); return n; }), { name: 'AbortError' });
  assert.equal(count, 1);
});
test('authored Pokémon materials win and reverse print cannot borrow the holo treatment', () => {
  const card: PokemonCard = { ...fixture('sv02')[16], id: 'sv02-135', localId: '135', name: 'Tyranitar', rarity: 'Rare', variants: ['holo', 'reverse'] };
  const exact = cards.find(c => c.id === 'tyranitar-paldea-evolved')!;
  const holo = pokemonDefinition(card, 'holo', cards), reverse = pokemonDefinition(card, 'reverse', cards);
  assert.equal(holo.maps, exact.maps); assert.equal(holo.profile, exact.profile); assert.equal(holo.front, exact.front);
  assert.equal(holo.pokemon?.variant, 'holo'); assert.equal(reverse.pokemon?.variant, 'reverse');
  assert.equal(reverse.maps, undefined); assert.equal(reverse.proceduralFoil, 'reverse'); assert.notEqual(holo.id, reverse.id);
  assert.equal(pokemonProfile(fixture()[0], 'normal'), 'print-only');
  assert.equal(pokemonProfile({ ...card, era: 'neo' }, 'holo'), 'pokemon-cosmos');
  assert.equal(pokemonProfile({ ...card, rarity: 'Hyper Rare' }, 'holo'), 'pokemon-rainbow-etched');
  assert.throws(() => pokemonDefinition(card, 'normal', cards), /Invalid/);
});
