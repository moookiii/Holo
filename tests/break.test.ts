import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBreakSquares } from '../src/materials/patterns/BreakSquares.ts';

test('BREAK filtering conserves domain area and never generates height or normals', () => {
  for (const height of [127, 256, 1024]) {
    const field = generateBreakSquares(6.3 / 8.8, 16.4, height);
    for (let i = 0; i < field.direction.length; i += 4) {
      assert.equal(field.direction.slice(i, i + 4).reduce((a, b) => a + b), 255);
      assert.deepEqual([...field.relief.slice(i, i + 3)], [128, 128, 128]);
    }
  }
});

test('BREAK domains are repeatable and preserve square scale across card widths', () => {
  const a = generateBreakSquares(.716, 16.4, 256), b = generateBreakSquares(.82, 16.4, 256);
  assert.deepEqual(a, generateBreakSquares(.716, 16.4, 256));
  for (let y = 0; y < a.height; y++) assert.deepEqual(
    a.direction.slice(y * a.width * 4, (y + 1) * a.width * 4),
    b.direction.slice(y * b.width * 4, (y * b.width + a.width) * 4));
});
