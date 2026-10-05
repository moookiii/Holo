import test from 'node:test';
import assert from 'node:assert/strict';
import { capturePassContext } from '../src/rendering/PassCompileContext.ts';
import { stabilizeShaderCodeOrder } from '../src/rendering/StableShaderCode.ts';
import { ResourceTelemetry } from '../src/rendering/ResourceTelemetry.ts';
import { PipelineCompletionBatch } from '../src/rendering/PipelineCompletionBatch.ts';

test('overlapping driver compilation waits for every pipeline and propagates failures', async () => {
  const batch = new PipelineCompletionBatch();
  let resolveFirst!: () => void, rejectSecond!: (reason: Error) => void;
  const first = new Promise<void>(resolve => { resolveFirst = resolve; });
  const second = new Promise<void>((_, reject) => { rejectSecond = reject; });
  batch.add([first, second]);
  const failure = new Error('Driver compilation failed');
  rejectSecond(failure);
  let finished = false;
  const completion = batch.finish().finally(() => { finished = true; });
  const rejected = assert.rejects(completion, error => error === failure);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(finished, false, 'Failure must not release resources while another pipeline is compiling');
  resolveFirst(); await rejected;
  const empty = new PipelineCompletionBatch(); await empty.finish();
});

test('pass compilation captures nested context and restores lookup before async work', async () => {
  const target = {}, other = {};
  const contexts = { get: (candidate: object, mrt?: unknown, depth = 0) => ({ candidate, mrt, depth }) };
  const original = contexts.get;
  const compilation = capturePassContext(contexts, target, async () => {
    assert.equal(contexts.get(target).depth, 1);
    assert.equal(contexts.get(other).depth, 0);
    assert.equal(contexts.get(target, null, 2).depth, 2);
    await Promise.resolve();
    assert.equal(contexts.get, original);
  });
  await compilation;
  assert.throws(() => capturePassContext(contexts, target, () => { throw new Error('failed'); }));
  assert.equal(contexts.get, original);
});

test('equivalent helpers canonicalize without changing bodies or calling a later declaration', () => {
  const a = { code: 'float a(float x) { return z(x) + 1.0; }' };
  const z = { code: 'float z(float x) { return x * x; }' };
  const b = { code: 'float b(float x) { return sin(x); }' };
  const first = [z, a, b], second = [b, z, a];
  stabilizeShaderCodeOrder(first); stabilizeShaderCodeOrder(second);
  assert.deepEqual(first, second);
  assert.ok(first.indexOf(z) < first.indexOf(a));
  assert.equal(first[0], b);
  stabilizeShaderCodeOrder(first); assert.deepEqual(first, second);
});

test('shader macros, overloads and dependency cycles preserve boundaries and order', () => {
  for (const source of [
    ['float z(float x) { return x; }', '#define FOO 1', 'float a(float x) { return FOO; }'],
    ['float f(float x) { return x; }', 'float f(vec2 x) { return x.x; }'],
    ['float b(float x) { return a(x); }', 'float a(float x) { return b(x); }'],
  ]) {
    const codes = source.map(code => ({ code })); stabilizeShaderCodeOrder(codes);
    assert.deepEqual(codes.map(entry => entry.code), source);
  }
});

test('resource counters measure real calls and restore backend ownership', () => {
  const backend = { createTexture: (..._args: unknown[]) => 7, updateTexture: () => {}, generateMipmaps: () => {} };
  const original = backend.createTexture, telemetry = new ResourceTelemetry(backend);
  assert.equal(backend.createTexture({}), 7); backend.updateTexture(); backend.generateMipmaps();
  assert.equal(telemetry.stats.textureAllocations, 1); assert.equal(telemetry.stats.textureUploads, 1); assert.equal(telemetry.stats.mipmapCalls, 1);
  telemetry.dispose(); assert.equal(backend.createTexture, original);
});
