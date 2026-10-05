import test from 'node:test';
import assert from 'node:assert/strict';
import { compactConstantRgba } from '../src/assets/ConstantTexture.ts';

test('uniform RGBA maps preserve every channel exactly', () => {
  const bytes = new Uint8Array(128 * 64 * 4);
  for (let i = 0; i < bytes.length; i += 4) bytes.set([128, 27, 255, 0], i);
  const result = compactConstantRgba(bytes);
  assert.deepEqual(result, new Uint8Array([128, 27, 255, 0]));
  for (let i = 0; i < bytes.length; i++) assert.equal(result[i % 4], bytes[i]);
});

test('even a single differing bit in any channel preserves the full map', () => {
  for (let channel = 0; channel < 4; channel++) {
    const bytes = new Uint8Array(256 * 4).fill(128);
    bytes[bytes.length - 4 + channel] = 129;
    assert.equal(compactConstantRgba(bytes), bytes);
  }
});
