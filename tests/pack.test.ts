import test from 'node:test';
import assert from 'node:assert/strict';
import { PackOpeningState } from '../src/pack/PackOpeningState.ts';
import { getPack, packRegistry, resolvePackContents, showcasePack, testPack } from '../src/pack/PackDefinition.ts';
import { Spring } from '../src/pack/PackMath.ts';
import { newNonHoloCards, nonHoloCardIds, nonHoloCards } from '../src/card/NonHoloCards.ts';

test('pack state machine rejects skipping physical stages and permits repeated card reveals', () => {
  const machine = new PackOpeningState();
  assert.throws(() => machine.transition('ExtractStack'));
  for (const state of ['PackReady', 'Grip', 'PackReady', 'Grip', 'Tear', 'OpenWrapper', 'ExtractStack', 'RevealCard', 'RevealCard', 'HitReveal', 'PackSummary', 'Inspect'] as const) machine.transition(state);
  assert.equal(machine.value, 'Inspect');
  assert.throws(() => machine.transition('Tear'));
});

test('the registry resolves distinct showcase and test packs', () => {
  assert.equal(getPack('archive-01'), showcasePack);
  assert.equal(getPack('test-pack'), testPack);
  assert.equal(packRegistry.length, 2);
  assert.notEqual(testPack.cardCount, showcasePack.cardCount);
  assert.notDeepEqual(testPack.contents, showcasePack.contents);
  assert.throws(() => getPack('missing-pack'), /Unknown pack/);
});

test('pack contents are deterministic, bounded and do not mutate the authored definition', () => {
  const copy = JSON.stringify(showcasePack);
  assert.equal(nonHoloCards.length, 350);
  assert.equal(newNonHoloCards.length, 332);
  assert.equal(newNonHoloCards.filter(card => card.franchise === 'Pokémon').length, 101);
  assert.equal(newNonHoloCards.filter(card => card.franchise === 'Yu-Gi-Oh!').length, 116);
  assert.equal(newNonHoloCards.filter(card => card.franchise === 'Magic: The Gathering').length, 115);
  const staticPokemon = ['Alakazam', 'Blastoise', 'Chansey', 'Clefairy', 'Gyarados', 'Hitmonchan', 'Machamp', 'Magneton', 'Mewtwo', 'Nidoking', 'Ninetales', 'Poliwrath', 'Raichu', 'Venusaur', 'Zapdos'];
  assert.ok(newNonHoloCards.every(card => !staticPokemon.includes(card.title)));
  assert.deepEqual(resolvePackContents(showcasePack, 42), resolvePackContents(showcasePack, 42));
  assert.notDeepEqual(resolvePackContents(showcasePack, 42), resolvePackContents(showcasePack, 43));
  assert.equal(JSON.stringify(showcasePack), copy);
  const contents = resolvePackContents(showcasePack, 1);
  assert.equal(contents.length, 15);
  assert.equal(new Set(contents.map(card => card.cardId)).size, 15);
  assert.equal(contents[14].reveal, 'studio-sweep');
  const pool = Array.from({ length: 20 }, (_, i) => ({ ...nonHoloCards[0], id: `gallery-${i}` }));
  assert.ok(resolvePackContents(showcasePack, 1, pool).every(card => card.cardId.startsWith('gallery-')));
  assert.throws(() => resolvePackContents(showcasePack, 1, pool.slice(0, 14)));
  assert.throws(() => resolvePackContents({ ...showcasePack, cardCount: 0 }, 1));
  assert.throws(() => resolvePackContents({ ...showcasePack, cardCount: 16 }, 1));
});

test('pack springs converge without overshoot and preserve travel across frame rates', () => {
  const values = [30, 60, 144, 240].map(rate => {
    const spring = new Spring(0, 1, 18);
    for (let i = 0; i < rate / 2; i++) { spring.step(1 / rate); assert.ok(spring.value >= 0 && spring.value <= 1); }
    return spring.value;
  });
  assert.ok(Math.max(...values) - Math.min(...values) < 1e-10);
  const spring = new Spring(0, 1, 18); spring.step(5); assert.equal(spring.value, 1);
});
