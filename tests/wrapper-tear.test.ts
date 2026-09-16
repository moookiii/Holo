import test from 'node:test';
import assert from 'node:assert/strict';
import { WrapperTearPath } from '../src/pack/wrapper/WrapperTearPath.ts';

test('a middle grip opens a local crack while both unvisited sides stay welded', () => {
  const path = new WrapperTearPath(7.55, 4.98);
  path.begin(0, 5.26); path.move(.8, 5.5);
  assert.ok(path.sample(.1, 1) > .9);
  assert.equal(path.sample(-.6, 1), 0);
  assert.equal(path.sample(.6, 1), 0);
  assert.ok(path.progress > .1 && path.progress < .2);
});

test('opposite grip directions produce mirrored fracture coverage', () => {
  const left = new WrapperTearPath(7.55, 4.98), right = new WrapperTearPath(7.55, 4.98);
  left.begin(-3.2, 5.26); left.move(-.8, 5.4);
  right.begin(3.2, 5.26); right.move(.8, 5.4);
  assert.equal(left.progress, right.progress);
  for (let i = 0; i < left.count; i++) assert.ok(Math.abs(left.field[i * 4 + 1] - right.field[(right.count - i - 1) * 4 + 1]) < 1e-6);
});

test('vertical steering changes the cut, and reversing or regripping cannot heal it', () => {
  const rising = new WrapperTearPath(7.55, 4.98), falling = new WrapperTearPath(7.55, 4.98);
  for (const [path, y] of [[rising, 5.8], [falling, 4.7]] as const) { path.begin(-3.2, 5.26); path.move(1, y); path.end(); }
  assert.equal(rising.progress, falling.progress);
  assert.ok(rising.sample(0, 0) > falling.sample(0, 0) + .2);
  const cut = rising.field.slice(), before = rising.progress;
  rising.begin(.8, 5.6); rising.move(-2, 4.7); rising.end();
  assert.equal(rising.progress, before);
  for (let i = 0; i < rising.count; i++) if (cut[i * 4 + 3]) assert.equal(rising.field[i * 4], cut[i * 4]);
  rising.begin(.8, 5.5); rising.move(4, 5.3);
  assert.equal(rising.progress, 1);
  assert.equal(rising.sample(1, 1), 1);
});

test('sparse pointer events cut the intervening seam and completion keeps authored bends', () => {
  const sparse = new WrapperTearPath(7.55, 4.98), dense = new WrapperTearPath(7.55, 4.98);
  sparse.begin(-3.775, 5.26); sparse.move(2, 5.7);
  dense.begin(-3.775, 5.26);
  for (let i = 1; i <= 80; i++) dense.move(-3.775 + 5.775 * i / 80, 5.26 + .44 * i / 80);
  assert.equal(sparse.progress, dense.progress);
  for (let i = 0; i < sparse.count; i++) assert.ok(Math.abs(sparse.field[i * 4] - dense.field[i * 4]) < .015);
  const before = sparse.sample(0, 0);
  sparse.fill(1);
  assert.equal(sparse.progress, 1); assert.equal(sparse.sample(0, 0), before);
  sparse.reset(); assert.ok(sparse.field.every(value => value === 0));
});
