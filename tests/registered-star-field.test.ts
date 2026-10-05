import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateRegisteredStarField } from '../src/materials/patterns/RegisteredStarField.ts';

// Golden hashes come from the unoptimized generator, verified byte-for-byte
// with scripts/registered-star-field-check.mjs. Include antialiased islands,
// sub-threshold pixels, background, non-square UVs and the production size.
test('registered star optimization preserves every direction and relief byte', () => {
  const image = { width: 80, height: 100, data: Uint8Array.from({ length: 8000 }, (_, i) =>
    i % 80 < 22 && Math.floor(i / 80) % 30 < 12 ? (i * 73) % 256 : i % 97 === 0 ? 7 : 0) };
  const cases = [
    [0, 128, .72, '4712418b9ca46c062302a5508c20b980bb2daa32aca720c749b01cdebdedb257'],
    [713, 257, .733, '4b0d6112344f5dc027b807efcb6e69e418253e2708e30482d4dce984008dbac5'],
    [9991, 2048, 6.3 / 8.8, '94676c68d6258cd9c3a6073b6c820508c513650ad65562d5d9ee8ec6d36ae686'],
  ] as const;
  for (const [seed, height, aspect, expected] of cases) {
    const result = generateRegisteredStarField({ kind: 'base-set-star', seed, aspect, scale: 12 }, height, image);
    assert.equal(result.width, Math.round(height * aspect)); assert.equal(result.height, height);
    assert.equal(createHash('sha256').update(result.direction).update(result.relief).digest('hex'), expected);
  }
});
