import test from 'node:test';
import assert from 'node:assert/strict';
import { PackOpeningState } from '../src/pack/PackOpeningState.ts';
import { archivePack02, archivePack03, getPack, packRegistry, resolvePackContents, showcasePack, testPack } from '../src/pack/PackDefinition.ts';
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
  assert.equal(getPack('archive-02'), archivePack02);
  assert.equal(getPack('archive-03'), archivePack03);
  assert.equal(getPack('test-pack'), testPack);
  assert.equal(packRegistry.length, 4);
  assert.notEqual(testPack.cardCount, showcasePack.cardCount);
  assert.notDeepEqual(testPack.contents, showcasePack.contents);
  assert.throws(() => getPack('missing-pack'), /Unknown pack/);
});

test('pack contents are deterministic, bounded and do not mutate the authored definition', () => {
  const copy = JSON.stringify(showcasePack);
  assert.equal(nonHoloCards.length, 150);
  assert.equal(newNonHoloCards.length, 100);
  assert.equal(newNonHoloCards.filter(card => card.franchise === 'Pokémon').length, 34);
  assert.equal(newNonHoloCards.filter(card => card.franchise === 'Yu-Gi-Oh!').length, 33);
  assert.equal(newNonHoloCards.filter(card => card.franchise === 'Magic: The Gathering').length, 33);
  const staticPokemon = ['Alakazam', 'Blastoise', 'Chansey', 'Clefairy', 'Gyarados', 'Hitmonchan', 'Magneton', 'Mewtwo', 'Nidoking', 'Ninetales', 'Poliwrath', 'Raichu', 'Venusaur', 'Zapdos'];
  assert.ok(newNonHoloCards.every(card => !staticPokemon.includes(card.title)));
  assert.deepEqual(resolvePackContents(showcasePack, 42), resolvePackContents(showcasePack, 42));
  assert.notDeepEqual(resolvePackContents(showcasePack, 42), resolvePackContents(showcasePack, 43));
  assert.equal(JSON.stringify(showcasePack), copy);
  const contents = resolvePackContents(showcasePack, 1);
  assert.equal(contents.length, 5);
  assert.equal(new Set(contents.slice(0, 4).map(card => card.cardId)).size, 4);
  assert.ok(contents.slice(0, 4).every(card => nonHoloCardIds.includes(card.cardId)));
  assert.ok(!nonHoloCardIds.includes(contents[4].cardId));
  assert.equal(contents[4].reveal, 'studio-sweep');
  assert.throws(() => resolvePackContents({ ...showcasePack, cardCount: 0 }, 1));
  assert.throws(() => resolvePackContents({ ...showcasePack, cardCount: 6 }, 1));
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
