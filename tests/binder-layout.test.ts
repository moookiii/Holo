import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BINDER, BinderNavigation, clampSpread, pocket, sheetPoint, spreadCount, spreadIndices } from '../src/binder/BinderLayout.ts';

test('photo layout has 12 pockets / page and 24 / spread without duplication', () => {
  assert.equal(BINDER.columns * BINDER.rows, 12);
  for (const count of [0, 1, 9, 10, 12, 13, 18, 19, 24, 25, 47, 48, 49, 10000]) {
    const indices = Array.from({ length: spreadCount(count) }, (_, s) => spreadIndices(s, count)).flat();
    assert.deepEqual(indices, Array.from({ length: count }, (_, i) => i));
    assert.ok(spreadIndices(spreadCount(count) - 1, count).length <= 24);
    assert.equal(clampSpread(99999, count), spreadCount(count) - 1);
  }
});
test('rapid turn input is locked, endpoints are clamped and repeated reversals stay consistent', () => {
  const nav = new BinderNavigation(73);
  assert.equal(nav.begin(-1), false);
  for (let cycle = 0; cycle < 20; cycle++) {
    assert.equal(nav.begin(1), true);
    for (let i = 0; i < 50; i++) assert.equal(nav.begin(i % 2 ? 1 : -1), false);
    for (let i = 0; i < 30; i++) nav.advance(.05);
    assert.equal(nav.spread, 1);
    assert.equal(nav.begin(-1), true);
    for (let i = 0; i < 30; i++) nav.advance(.05);
    assert.equal(nav.spread, 0);
  }
  nav.spread = 3; nav.setCount(1); assert.equal(nav.spread, 0);
});
test('sheet bends instead of turning as a rigid rectangle and lands in registration', () => {
  const start = sheetPoint(BINDER.pageWidth, 0, 1), end = sheetPoint(BINDER.pageWidth, 1, 1);
  assert.ok(Math.abs(start.x - (BINDER.pageWidth + BINDER.hinge)) < 1e-6);
  assert.ok(Math.abs(end.x - (-BINDER.hinge - BINDER.pageWidth)) < 1e-6);
  assert.ok(Math.abs(start.z - .42) < 1e-6 && Math.abs(end.z - .42) < 1e-6);
  const inner = sheetPoint(4, .4, 1), outer = sheetPoint(27, .4, 1);
  assert.ok(Math.abs(inner.angle - outer.angle) > .25);
  assert.ok(outer.z > inner.z);
  for (let i = 0; i < 12; i++) {
    const left = pocket(i, -1), right = pocket(i, 1);
    assert.equal(left.y, right.y);
    assert.ok(left.u > 0 && left.u < BINDER.pageWidth);
  }
});
