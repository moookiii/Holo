import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packPreviewEtch, PREVIEW_ETCH_WIDTH, PREVIEW_ETCH_HEIGHT } from '../src/card/PreviewEtchPacking.ts';

test('packing preserves full-card row orientation and both signed tangent channels', () => {
  const rgba = new Uint8Array([
    1, 101, 255, 255, 2, 102, 255, 255, 3, 103, 255, 255, 4, 104, 255, 255,
    5, 105, 255, 255, 6, 106, 255, 255, 7, 107, 255, 255, 8, 108, 255, 255,
    9, 109, 255, 255, 10, 110, 255, 255, 11, 111, 255, 255, 12, 112, 255, 255,
    13, 113, 255, 255, 14, 114, 255, 255, 15, 115, 255, 255, 16, 116, 255, 255,
  ]);
  const packed = packPreviewEtch(rgba, 4, 4);
  assert.deepEqual([...packed.x], [
    1, 3, 9, 11, 2, 4, 10, 12, 3, 4, 11, 12,
    5, 7, 13, 15, 6, 8, 14, 16, 7, 8, 15, 16,
    9, 11, 13, 15, 10, 12, 14, 16, 11, 12, 15, 16,
  ]);
  assert.deepEqual([...packed.y], [...packed.x].map(value => value + 100));
  assert.equal(packed.x.byteLength + packed.y.byteLength, 3 * 3 * 4 * 2);
  assert.equal(rgba[0], 1, 'The authored source stays unchanged');
});

test('invalid packing dimensions cannot silently crop an authored source', () => {
  assert.throws(() => packPreviewEtch(new Uint8Array(24), 3, 2));
  assert.throws(() => packPreviewEtch(new Uint8Array(24), 2, 2));
});

test('gallery-sized normals fit the existing atlas slots, including shared boundary texels', () => {
  const source = new Uint8Array(PREVIEW_ETCH_WIDTH * PREVIEW_ETCH_HEIGHT * 4);
  source.fill(128);
  const { x, y } = packPreviewEtch(source, PREVIEW_ETCH_WIDTH, PREVIEW_ETCH_HEIGHT);
  assert.equal(x.byteLength, 256 * 360 * 4);
  assert.equal(y.byteLength, 256 * 360 * 4);
  assert.ok(x.every(value => value === 128));
  assert.ok(y.every(value => value === 128));
});
