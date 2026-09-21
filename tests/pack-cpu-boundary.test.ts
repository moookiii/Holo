import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPack, resolvePackContents } from '../src/pack/PackDefinition.ts';

test('exact next-pack contents are deterministic for the prepared seed', () => {
  const pack = getPack('archive-01');
  const first = resolvePackContents(pack, 0x12345678);
  const second = resolvePackContents(pack, 0x12345678);
  assert.deepEqual(first, second);
  assert.equal(first.length, 5);
  assert.equal(new Set(first.map(card => card.cardId)).size, 5);
});

test('CPU pack preparation has no renderer or GPU realization dependency', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/card/CardCpuPreparation.ts'), 'utf8');
  assert.doesNotMatch(source, /from ['"]three\/(webgpu|tsl)['"]|renderer\.|DataTexture|compileAsync|initTexture|RenderTarget/);
  assert.match(source, /map-packer\.worker/);
  assert.match(source, /pattern\.worker/);
});
