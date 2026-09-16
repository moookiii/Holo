import test from 'node:test';
import assert from 'node:assert/strict';
import { PackOpeningState } from '../src/pack/PackOpeningState.ts';
import { getPack, resolvePackContents, showcasePack, testPack } from '../src/pack/PackDefinition.ts';
import { Spring } from '../src/pack/PackMath.ts';

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
  assert.notEqual(testPack.cardCount, showcasePack.cardCount);
  assert.notDeepEqual(testPack.contents, showcasePack.contents);
  assert.throws(() => getPack('missing-pack'), /Unknown pack/);
});

test('pack contents are deterministic, bounded and do not mutate the authored definition', () => {
  const copy = JSON.stringify(showcasePack);
  assert.deepEqual(resolvePackContents(showcasePack, 1), resolvePackContents(showcasePack, 200));
  const shuffled = { ...showcasePack, order: 'seeded' as const };
  assert.deepEqual(resolvePackContents(shuffled, 42), resolvePackContents(shuffled, 42));
  assert.notDeepEqual(resolvePackContents(shuffled, 42), resolvePackContents(shuffled, 43));
  assert.equal(JSON.stringify(showcasePack), copy);
  assert.equal(resolvePackContents(showcasePack, 1).at(-1)?.reveal, 'studio-sweep');
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
