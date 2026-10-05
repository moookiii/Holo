import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { register } from 'node:module';

// Load the unchanged general generator as the reference, including its TS
// imports. This checks pixels, not just equivalent-looking screenshots.
register(`data:text/javascript,${encodeURIComponent(`
import { existsSync } from 'node:fs';
export function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL) {
    const url = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(url)) return next(url.href, context);
  }
  return next(specifier, context);
}`)}`, import.meta.url);
{
  const { generateField } = await import('../src/materials/patterns/ManufacturingField.ts');
  const { generateRegisteredStarField } = await import('../src/materials/patterns/RegisteredStarField.ts');
  const image = { width: 80, height: 100, data: Uint8Array.from({ length: 8000 }, (_, i) =>
    i % 80 < 22 && Math.floor(i / 80) % 30 < 12 ? (i * 73) % 256 : i % 97 === 0 ? 7 : 0) };
  for (const [seed, height, aspect] of [[0, 128, .72], [713, 257, .733], [9991, 2048, 6.3 / 8.8]]) {
    const spec = { kind: 'base-set-star', seed, aspect, scale: 12 };
    const start = performance.now(), reference = generateField(spec, height, image), referenceMs = performance.now() - start;
    const next = performance.now(), result = generateRegisteredStarField(spec, height, image), optimizedMs = performance.now() - next;
    assert.equal(result.width, reference.width); assert.equal(result.height, reference.height);
    assert.deepEqual(result.direction, reference.direction); assert.deepEqual(result.relief, reference.relief);
    const hash = createHash('sha256').update(result.direction).update(result.relief).digest('hex');
    console.log(JSON.stringify({ seed, height, aspect, referenceMs, optimizedMs, hash }));
  }
}
