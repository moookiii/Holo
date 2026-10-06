import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { generateRegisteredStarField } from '../src/materials/patterns/RegisteredStarField.ts';

const out = new URL('../artifacts/favorites-binder/', import.meta.url);
await mkdir(out, { recursive: true });
let source = execFileSync('git', ['show', 'dcdd1350:src/materials/patterns/RegisteredStarField.ts'], { encoding: 'utf8' });
for (const name of ['RegisteredStars', 'Orientation']) source = source.replace(`'./${name}.ts'`,
  JSON.stringify(new URL(`../src/materials/patterns/${name}.ts`, import.meta.url).href));
const baselineFile = new URL('RegisteredStarField-reference.ts', out);
await writeFile(baselineFile, source);
const baseline = (await import(baselineFile.href)).generateRegisteredStarField;
const image = { width: 80, height: 100, data: Uint8Array.from({ length: 8000 }, (_, i) =>
  i % 80 < 22 && Math.floor(i / 80) % 30 < 12 ? (i * 73) % 256 : i % 97 === 0 ? 7 : 0) };
const samples = [];
for (let run = 0; run < 6; run++) {
  const spec = { kind: 'base-set-star', seed: 9991 + run, aspect: 6.3 / 8.8, scale: 12 };
  const results = [];
  // Alternate order to avoid always giving one implementation the warm CPU.
  for (const optimized of run % 2 ? [true, false] : [false, true]) {
    const start = performance.now();
    const field = (optimized ? generateRegisteredStarField : baseline)(spec, 2048, image);
    results.push({ optimized, ms: performance.now() - start, field });
  }
  assert.deepEqual(results[0].field.direction, results[1].field.direction);
  assert.deepEqual(results[0].field.relief, results[1].field.relief);
  const sample = { baselineMs: results.find(r => !r.optimized).ms, optimizedMs: results.find(r => r.optimized).ms };
  samples.push(sample);
  console.log(JSON.stringify(sample));
}
await writeFile(new URL('star-row-cpu-report.json', out), JSON.stringify(samples, null, 2));
