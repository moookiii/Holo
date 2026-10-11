import test from 'node:test';
import assert from 'node:assert/strict';
import type { Node } from 'three/webgpu';
import { normalMipVariance } from '../src/materials/layers/AuthoredNormalFiltering.ts';

// Evaluate the TSL arithmetic directly without requiring a GPU in Node tests.
// This adapter implements operations, not the filtering formula.
class Value {
  readonly values: number[];
  constructor(values: number[]) { this.values = values; }
  map(fn: (x: number) => number) { return new Value(this.values.map(fn)); }
  mul(n: number) { return this.map(x => x * n); }
  sub(n: number) { return this.map(x => x - n); }
  length() { return new Value([Math.hypot(...this.values)]); }
  clamp(lo: number, hi: number) { return this.map(x => Math.max(lo, Math.min(hi, x))); }
  oneMinus() { return this.map(x => 1 - x); }
  max(n: number) { return this.map(x => Math.max(n, x)); }
  div(n: Value) { return this.map(x => x / n.values[0]); }
}
const variance = (normal: number[]) => (normalMipVariance(new Value(normal.map(x => x * .5 + .5)) as unknown as Node<'vec3'>) as unknown as Value).values[0];

test('resolved unit normals and RGB8 quantization do not broaden the material', () => {
  for (let angle = 0; angle < Math.PI * 2; angle += .01) {
    const n = [Math.cos(angle) * .8, Math.sin(angle) * .8, .6];
    assert.equal(variance(n), 0);
    assert.equal(variance(n.map(x => Math.round((x * .5 + .5) * 255) / 255 * 2 - 1)), 0);
  }
});

test('subpixel opposed grooves retain variance even when their mean direction is flat', () => {
  // Equal +X/-X grooves have a flat average direction, but nonzero spread.
  const values = [.1, .2, .4, .6].map(slope => variance([0, 0, Math.sqrt(1 - slope * slope)]));
  assert.equal(values[0], 0); // Below the conservative RGB8 precision bound.
  assert.ok(values[1] > 0);
  assert.ok(values.every((value, i) => i === 0 || value > values[i - 1]));
});

test('mip variance is finite for degenerate data and invariant under normal direction', () => {
  assert.ok(Number.isFinite(variance([0, 0, 0])));
  assert.equal(variance([0, 0, .8]), variance([.8, 0, 0]));
  assert.equal(variance([0, 0, 1.001]), 0);
});
